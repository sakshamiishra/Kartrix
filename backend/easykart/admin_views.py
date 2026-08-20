from decimal import Decimal
from django.db import transaction, models
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from accounts.models import User
from accounts.serializers import UserSerializer
from accounts.permissions import IsSuperUser
from products.permissions import IsStaffUser
from products.models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductAttribute,
    AttributeValue,
    ProductVariant,
    Inventory,
    InventoryTransaction,
)
from products.serializers import (
    CategorySerializer,
    BrandSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    ProductVariantSerializer,
    ProductImageSerializer,
    InventorySerializer,
    InventoryTransactionSerializer,
)
from orders.models import Order, OrderItem, OrderStatusHistory, Coupon
from orders.serializers import OrderSerializer, OrderItemSerializer, OrderStatusHistorySerializer, CouponSerializer
from payments.models import Payment
from payments.serializers import PaymentSerializer
from reviews.models import Review
from reviews.serializers import ReviewSerializer


class AdminDashboardStatsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        total_orders = Order.objects.count()
        total_revenue_val = Order.objects.filter(payment_status=Order.PaymentStatus.PAID).aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.00')
        total_customers = User.objects.filter(is_staff=False).count()
        total_products = Product.objects.count()
        low_stock_count = Inventory.objects.filter(quantity__lte=F('reorder_level')).count()
        pending_orders_count = Order.objects.filter(status=Order.OrderStatus.PLACED).count()
        pending_reviews_count = Review.objects.filter(is_approved=False).count()

        recent_orders_qs = Order.objects.select_related('user').order_by('-created_at')[:5]
        recent_orders = [
            {
                'order_number': o.order_number,
                'user_email': o.user.email,
                'total_amount': str(o.total_amount),
                'status': o.status,
                'payment_status': o.payment_status,
                'created_at': o.created_at,
            }
            for o in recent_orders_qs
        ]

        return Response({
            'total_orders': total_orders,
            'total_revenue': str(total_revenue_val),
            'total_customers': total_customers,
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'pending_orders_count': pending_orders_count,
            'pending_reviews_count': pending_reviews_count,
            'recent_orders': recent_orders,
        })


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    filterset_fields = ['category', 'brand', 'is_active']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        return (
            Product.objects.all()
            .annotate(
                average_rating=models.functions.Coalesce(models.Avg('reviews__rating', filter=Q(reviews__is_approved=True)), 0.0, output_field=models.FloatField()),
                review_count=Count('reviews', filter=Q(reviews__is_approved=True), distinct=True),
                variant_count=Count('variants', distinct=True),
                total_stock=models.functions.Coalesce(Sum('variants__inventory__quantity'), 0, output_field=models.IntegerField())
            )
            .select_related('category', 'brand')
            .prefetch_related('images', 'variants', 'variants__inventory', 'variants__attribute_values')
            .order_by('-created_at')
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductCreateUpdateSerializer

    @action(detail=True, methods=['post'], url_path='variants')
    def create_variant(self, request, pk=None):
        product = self.get_object()

        # Validate initial stock if provided
        stock_val = request.data.get('initial_stock') if 'initial_stock' in request.data else request.data.get('stock') if 'stock' in request.data else request.data.get('quantity')
        init_qty = 0
        if stock_val is not None and str(stock_val).strip() != '':
            try:
                init_qty = int(stock_val)
                if init_qty < 0:
                    raise ValidationError({"stock": "Stock quantity cannot be negative."})
            except (ValueError, TypeError):
                raise ValidationError({"stock": "Stock quantity must be a valid integer."})

        serializer = ProductVariantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            variant = serializer.save(product=product)

            # Handle optional variant name / value passed from frontend (e.g. name: "White")
            variant_name = request.data.get('name') or request.data.get('variant_name')
            if variant_name and str(variant_name).strip():
                attr, _ = ProductAttribute.objects.get_or_create(name='Option')
                attr_val, _ = AttributeValue.objects.get_or_create(attribute=attr, value=str(variant_name).strip())
                variant.attribute_values.add(attr_val)

            # Ensure Inventory record exists and set initial stock
            inv, created = Inventory.objects.get_or_create(
                product_variant=variant,
                defaults={'quantity': init_qty, 'reserved_quantity': 0, 'reorder_level': 5}
            )
            if not created:
                inv.quantity = init_qty
                inv.save(update_fields=['quantity', 'updated_at'])

        return Response(ProductVariantSerializer(variant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put', 'patch'], url_path=r'variants/(?P<variant_id>\d+)')
    def update_variant(self, request, pk=None, variant_id=None):
        product = self.get_object()
        try:
            variant = product.variants.get(pk=variant_id)
        except ProductVariant.DoesNotExist:
            raise NotFound("Product variant not found.")

        serializer = ProductVariantSerializer(variant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            variant = serializer.save()

            # Handle optional name update
            variant_name = request.data.get('name') or request.data.get('variant_name')
            if variant_name is not None and str(variant_name).strip():
                attr, _ = ProductAttribute.objects.get_or_create(name='Option')
                attr_val, _ = AttributeValue.objects.get_or_create(attribute=attr, value=str(variant_name).strip())
                variant.attribute_values.set([attr_val])

        return Response(ProductVariantSerializer(variant).data)

    @action(detail=True, methods=['post'], url_path='images')
    def upload_image(self, request, pk=None):
        product = self.get_object()
        image_file = request.FILES.get('image')
        if not image_file:
            raise ValidationError({"image": "Image file is required."})

        is_primary = str(request.data.get('is_primary', 'false')).lower() == 'true'
        display_order = int(request.data.get('display_order', 0))

        with transaction.atomic():
            if is_primary:
                ProductImage.objects.filter(product=product).update(is_primary=False)

            img_obj = ProductImage.objects.create(
                product=product,
                image=image_file,
                is_primary=is_primary,
                display_order=display_order
            )

        return Response(ProductImageSerializer(img_obj, context={'request': request}).data, status=status.HTTP_201_CREATED)


from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by('name')
    search_fields = ['name', 'slug']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product_count = instance.products.count()
        if product_count > 0:
            return Response(
                {'detail': f'Cannot delete category "{instance.name}" because {product_count} product(s) are using it. Reassign those products before deleting.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class AdminBrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = BrandSerializer
    queryset = Brand.objects.all().order_by('name')
    search_fields = ['name', 'slug']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        product_count = instance.products.count()
        if product_count > 0:
            return Response(
                {'detail': f'Cannot delete brand "{instance.name}" because {product_count} product(s) are using it. Reassign those products to another brand or No Brand before deleting.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class AdminInventoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = InventorySerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = Inventory.objects.select_related(
            'product_variant',
            'product_variant__product'
        ).prefetch_related(
            'product_variant__attribute_values'
        ).all()

        search_query = self.request.query_params.get('search', '').strip()
        if search_query:
            qs = qs.filter(
                Q(product_variant__product__name__icontains=search_query) |
                Q(product_variant__attribute_values__value__icontains=search_query) |
                Q(product_variant__sku__icontains=search_query)
            ).distinct()

        stock_filter = self.request.query_params.get('stock_filter', '').strip().lower()
        if stock_filter == 'out_of_stock':
            qs = qs.filter(quantity__lte=0)
        elif stock_filter == 'low_stock':
            qs = qs.filter(quantity__gt=0, quantity__lte=F('reorder_level'))
        elif stock_filter == 'in_stock':
            qs = qs.filter(quantity__gt=F('reorder_level'))

        return qs.order_by('quantity', 'id')

    @action(detail=False, methods=['post'], url_path='adjust')
    def adjust_stock(self, request):
        inventory_id = request.data.get('inventory_id')
        quantity_change = request.data.get('quantity_change')
        tx_type = request.data.get('transaction_type', InventoryTransaction.TransactionType.ADJUSTMENT)
        note = request.data.get('note', '')

        if not inventory_id or quantity_change is None:
            raise ValidationError({"detail": "inventory_id and quantity_change are required."})

        try:
            quantity_change = int(quantity_change)
        except ValueError:
            raise ValidationError({"quantity_change": "Must be an integer."})

        with transaction.atomic():
            try:
                inv = Inventory.objects.select_for_update().get(id=inventory_id)
            except Inventory.DoesNotExist:
                raise NotFound("Inventory record not found.")

            new_qty = inv.quantity + quantity_change
            if new_qty < 0:
                raise ValidationError({"quantity_change": f"Adjustment would result in negative stock ({new_qty})."})

            inv.quantity = new_qty
            inv.save(update_fields=['quantity', 'updated_at'])

            tx_obj = InventoryTransaction.objects.create(
                inventory=inv,
                transaction_type=tx_type,
                quantity=abs(quantity_change),
                reference=f"ADMIN_ADJUST:{request.user.email}:{note}"
            )

        return Response({
            'inventory': InventorySerializer(inv).data,
            'transaction': InventoryTransactionSerializer(tx_obj).data
        })

    @action(detail=False, methods=['get'], url_path='transactions')
    def list_transactions(self, request):
        qs = InventoryTransaction.objects.select_related(
            'inventory', 'inventory__product_variant', 'inventory__product_variant__product'
        ).order_by('-created_at')

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            serializer = InventoryTransactionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = InventoryTransactionSerializer(qs, many=True)
        return Response(serializer.data)


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = OrderSerializer
    lookup_field = 'order_number'

    def get_queryset(self):
        qs = Order.objects.all().select_related('payment', 'address', 'user').prefetch_related('items', 'status_history').order_by('-created_at')
        status_param = self.request.query_params.get('status')
        payment_status_param = self.request.query_params.get('payment_status')
        search_param = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param)
        if payment_status_param:
            qs = qs.filter(payment_status=payment_status_param)
        if search_param:
            qs = qs.filter(Q(order_number__icontains=search_param) | Q(user__email__icontains=search_param))

        return qs

    ALLOWED_TRANSITIONS = {
        Order.OrderStatus.PLACED: [Order.OrderStatus.CONFIRMED, Order.OrderStatus.CANCELLED],
        Order.OrderStatus.CONFIRMED: [Order.OrderStatus.PROCESSING, Order.OrderStatus.CANCELLED],
        Order.OrderStatus.PROCESSING: [Order.OrderStatus.SHIPPED],
        Order.OrderStatus.SHIPPED: [Order.OrderStatus.OUT_FOR_DELIVERY],
        Order.OrderStatus.OUT_FOR_DELIVERY: [Order.OrderStatus.DELIVERED],
        Order.OrderStatus.DELIVERED: [Order.OrderStatus.RETURNED],
        Order.OrderStatus.CANCELLED: [],
        Order.OrderStatus.RETURNED: [],
    }

    @action(detail=True, methods=['post'], url_path='update_status')
    def update_status(self, request, order_number=None):
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        if not new_status:
            raise ValidationError({"status": "Status is required."})

        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(order_number=order_number)
            except Order.DoesNotExist:
                raise NotFound("Order not found.")

            allowed = self.ALLOWED_TRANSITIONS.get(order.status, [])
            if new_status not in allowed:
                raise ValidationError({
                    "detail": f"Invalid order status transition from '{order.get_status_display()}' to '{new_status}'. Allowed transitions: {allowed}"
                })

            old_status = order.status
            order.status = new_status
            order.save(update_fields=['status', 'updated_at'])

            # Handle inventory stock restoration if cancelling
            if new_status == Order.OrderStatus.CANCELLED:
                for item in order.items.select_related('product_variant', 'product_variant__inventory').all():
                    variant = item.product_variant
                    if variant and hasattr(variant, 'inventory') and variant.inventory:
                        inv = Inventory.objects.select_for_update().get(id=variant.inventory.id)
                        inv.quantity += item.quantity
                        inv.save(update_fields=['quantity', 'updated_at'])
                        InventoryTransaction.objects.create(
                            inventory=inv,
                            transaction_type=InventoryTransaction.TransactionType.RESTOCK,
                            quantity=item.quantity,
                            reference=f"ORDER_CANCELLED_RESTORE:{order.order_number}"
                        )

            history_note = note or f"Status updated from {old_status} to {new_status} by admin."
            OrderStatusHistory.objects.create(
                order=order,
                status=new_status,
                note=history_note,
                changed_by=request.user
            )

        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='confirm_cod')
    def confirm_cod_payment(self, request, order_number=None):
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(order_number=order_number)
            except Order.DoesNotExist:
                raise NotFound("Order not found.")

            if order.payment_status == Order.PaymentStatus.PAID:
                return Response(OrderSerializer(order).data)

            order.payment_status = Order.PaymentStatus.PAID
            order.save(update_fields=['payment_status', 'updated_at'])

            if hasattr(order, 'payment') and order.payment:
                payment = order.payment
                payment.status = Payment.PaymentStatus.PAID
                payment.paid_at = timezone.now()
                payment.save(update_fields=['status', 'paid_at', 'updated_at'])

            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                note="COD Payment confirmed as RECEIVED by admin.",
                changed_by=request.user
            )

        return Response(OrderSerializer(order).data)


class AdminPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('order').all().order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='record_refund')
    def record_refund(self, request, pk=None):
        payment = self.get_object()
        note = request.data.get('note', '')

        if payment.status == Payment.PaymentStatus.PENDING or payment.status == Payment.PaymentStatus.FAILED:
            raise ValidationError({"detail": f"Cannot record refund for a payment in '{payment.get_status_display()}' status."})

        if payment.status == Payment.PaymentStatus.REFUNDED:
            return Response(PaymentSerializer(payment).data)

        with transaction.atomic():
            payment.status = Payment.PaymentStatus.REFUNDED
            payment.save(update_fields=['status', 'updated_at'])

            history_note = f"Payment marked as REFUNDED (DB Audit Record). Note: {note}".strip()
            OrderStatusHistory.objects.create(
                order=payment.order,
                status=payment.order.status,
                note=history_note,
                changed_by=request.user
            )

        return Response(PaymentSerializer(payment).data)


class AdminReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = ReviewSerializer
    queryset = Review.objects.all().select_related('user', 'product', 'order_item').prefetch_related('images').order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='toggle_approval')
    def toggle_approval(self, request, pk=None):
        review = self.get_object()
        review.is_approved = not review.is_approved
        review.save(update_fields=['is_approved', 'updated_at'])
        return Response(ReviewSerializer(review).data)


class AdminCouponViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all().order_by('-created_at')
    search_fields = ['code', 'description']


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-date_joined')
    search_fields = ['email', 'first_name', 'last_name']

    @action(detail=True, methods=['post'], url_path='toggle_staff', permission_classes=[IsSuperUser])
    def toggle_staff(self, request, pk=None):
        user_to_toggle = self.get_object()
        if user_to_toggle.id == request.user.id:
            raise ValidationError({"detail": "You cannot change your own staff status."})

        user_to_toggle.is_staff = not user_to_toggle.is_staff
        user_to_toggle.save(update_fields=['is_staff', 'updated_at'])
        return Response(UserSerializer(user_to_toggle).data)
