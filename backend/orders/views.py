import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import Order, OrderItem, OrderStatusHistory
from .serializers import OrderSerializer, CheckoutSerializer
from accounts.models import Address
from accounts.serializers import AddressSerializer
from cart.models import Cart
from cart.serializers import CartItemSerializer
from payments.models import Payment
from products.models import Inventory, InventoryTransaction


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = 'order_number'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('payment', 'address').prefetch_related('items', 'status_history').order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, order_number=None):
        order = self.get_object()

        if order.status not in [Order.OrderStatus.PLACED, Order.OrderStatus.CONFIRMED]:
            raise ValidationError({
                "detail": f"Order #{order.order_number} cannot be cancelled because it is in '{order.get_status_display()}' status."
            })

        with transaction.atomic():
            order.status = Order.OrderStatus.CANCELLED
            order.save(update_fields=['status', 'updated_at'])

            if order.payment_status == Order.PaymentStatus.PAID:
                history_note = "Order cancelled by customer. Online refund pending manual/admin processing."
            else:
                history_note = "Order cancelled by customer."

            OrderStatusHistory.objects.create(
                order=order,
                status=Order.OrderStatus.CANCELLED,
                note=history_note,
                changed_by=request.user,
            )

            # Restore stock for each item in the cancelled order
            for item in order.items.select_related('product_variant', 'product_variant__inventory').all():
                variant = item.product_variant
                if variant and hasattr(variant, 'inventory') and variant.inventory:
                    inv = Inventory.objects.select_for_update().get(id=variant.inventory.id)
                    cancel_ref = f"CANCEL:{order.order_number}"
                    already_restocked = InventoryTransaction.objects.filter(
                        inventory=inv,
                        reference=cancel_ref
                    ).exists()

                    if not already_restocked:
                        inv.quantity += item.quantity
                        inv.save(update_fields=['quantity', 'updated_at'])

                        InventoryTransaction.objects.create(
                            inventory=inv,
                            transaction_type=InventoryTransaction.TransactionType.RESTOCK,
                            quantity=item.quantity,
                            reference=cancel_ref,
                            created_by=request.user,
                        )

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CheckoutViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        address_id = serializer.validated_data['address_id']
        payment_method = serializer.validated_data.get('payment_method', 'RAZORPAY')
        address = Address.objects.get(id=address_id, user=request.user)

        cart = Cart.objects.filter(user=request.user).first()
        if not cart or not cart.items.exists():
            raise ValidationError({"detail": "Your cart is empty. Add items to cart before checkout."})

        with transaction.atomic():
            cart_items = list(cart.items.select_related('product', 'product_variant', 'product_variant__inventory').all())

            if not cart_items:
                raise ValidationError({"detail": "Your cart is empty."})

            computed_items = []
            subtotal = Decimal('0.00')

            for item in cart_items:
                product = item.product
                variant = item.product_variant

                if not product or not product.is_active:
                    raise ValidationError({"detail": f"Product '{product.name if product else 'Item'}' is inactive and cannot be ordered."})

                if variant:
                    if not variant.is_active:
                        raise ValidationError({"detail": f"Product variant for '{product.name}' is inactive and cannot be ordered."})
                    if hasattr(variant, 'inventory') and variant.inventory:
                        inv = Inventory.objects.select_for_update().get(id=variant.inventory.id)
                        available = inv.available_stock
                        if item.quantity > available:
                            raise ValidationError({
                                "detail": f"Requested quantity ({item.quantity}) for '{product.name}' exceeds available stock ({available})."
                            })

                unit_price_str = CartItemSerializer().get_unit_price(item)
                unit_price = Decimal(unit_price_str)
                item_subtotal = unit_price * Decimal(item.quantity)
                subtotal += item_subtotal

                product_display_name = product.name
                if variant:
                    attrs_str = ", ".join(
                        f"{av.attribute.name}: {av.value}"
                        for av in variant.attribute_values.select_related('attribute').all()
                    )
                    if attrs_str:
                        product_display_name = f"{product.name} ({attrs_str})"

                computed_items.append({
                    'product': product,
                    'variant': variant,
                    'name': product_display_name,
                    'unit_price': unit_price,
                    'quantity': item.quantity,
                    'subtotal': item_subtotal,
                })

            # Generate unique order number: EK-YYYYMMDD-HEX
            now_str = timezone.now().strftime('%Y%m%d')
            rand_hex = uuid.uuid4().hex[:6].upper()
            order_number = f"EK-{now_str}-{rand_hex}"
            while Order.objects.filter(order_number=order_number).exists():
                rand_hex = uuid.uuid4().hex[:6].upper()
                order_number = f"EK-{now_str}-{rand_hex}"

            # Address snapshot
            address_snapshot = AddressSerializer(address).data

            discount = Decimal('0.00')
            shipping_cost = Decimal('0.00')
            total_amount = subtotal - discount + shipping_cost

            order = Order.objects.create(
                user=request.user,
                address=address,
                shipping_address_snapshot=address_snapshot,
                order_number=order_number,
                subtotal=subtotal,
                discount=discount,
                shipping_cost=shipping_cost,
                total_amount=total_amount,
                status=Order.OrderStatus.PLACED,
                payment_status=Order.PaymentStatus.PENDING,
            )

            for ci in computed_items:
                OrderItem.objects.create(
                    order=order,
                    product=ci['product'],
                    product_variant=ci['variant'],
                    product_name=ci['name'],
                    unit_price=ci['unit_price'],
                    quantity=ci['quantity'],
                    subtotal=ci['subtotal'],
                )

            Payment.objects.create(
                order=order,
                payment_method=payment_method,
                payment_gateway='Razorpay' if payment_method == 'RAZORPAY' else '',
                amount=total_amount,
                currency='INR',
                status=Payment.PaymentStatus.PENDING,
            )

            OrderStatusHistory.objects.create(
                order=order,
                status=Order.OrderStatus.PLACED,
                note='Order placed successfully via Cash on Delivery.' if payment_method == 'COD' else 'Order placed successfully.',
                changed_by=request.user,
            )

            # Deduct inventory immediately for COD orders
            if payment_method == 'COD':
                for ci in computed_items:
                    variant = ci['variant']
                    if variant and hasattr(variant, 'inventory') and variant.inventory:
                        inv = Inventory.objects.select_for_update().get(id=variant.inventory.id)
                        sale_ref = f"ORDER:{order.order_number}"
                        already_deducted = InventoryTransaction.objects.filter(
                            inventory=inv,
                            reference=sale_ref,
                            transaction_type=InventoryTransaction.TransactionType.SALE
                        ).exists()

                        if not already_deducted:
                            if inv.available_stock < ci['quantity']:
                                raise ValidationError({"detail": f"Insufficient stock for '{ci['name']}'."})
                            inv.quantity -= ci['quantity']
                            inv.save(update_fields=['quantity', 'updated_at'])

                            InventoryTransaction.objects.create(
                                inventory=inv,
                                transaction_type=InventoryTransaction.TransactionType.SALE,
                                quantity=-ci['quantity'],
                                reference=sale_ref,
                                created_by=request.user,
                            )

            # Clear cart items after successful order creation
            cart.items.all().delete()

        output_serializer = OrderSerializer(order)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


