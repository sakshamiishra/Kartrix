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


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = 'order_number'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items', 'status_history').order_by('-created_at')


class CheckoutViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        address_id = serializer.validated_data['address_id']
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
                        available = variant.inventory.available_stock
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

            OrderStatusHistory.objects.create(
                order=order,
                status=Order.OrderStatus.PLACED,
                note='Order placed successfully.',
                changed_by=request.user,
            )

            # Clear cart items after successful order creation
            cart.items.all().delete()

        output_serializer = OrderSerializer(order)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
