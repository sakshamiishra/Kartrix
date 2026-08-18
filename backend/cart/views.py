from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer


class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart.items.all().delete()
        return Response({'detail': 'Cart cleared successfully.'}, status=status.HTTP_200_OK)


class CartItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CartItemSerializer

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        product = serializer.validated_data['product']
        variant = serializer.validated_data.get('product_variant')
        quantity = serializer.validated_data.get('quantity', 1)

        existing_item = CartItem.objects.filter(
            cart=cart,
            product=product,
            product_variant=variant
        ).first()

        if existing_item:
            new_qty = existing_item.quantity + quantity
            if variant and hasattr(variant, 'inventory') and variant.inventory:
                if new_qty > variant.inventory.available_stock:
                    raise ValidationError({
                        "quantity": f"Cannot add. Total quantity ({new_qty}) exceeds available stock ({variant.inventory.available_stock})."
                    })
            existing_item.quantity = new_qty
            existing_item.save()
            serializer.instance = existing_item
        else:
            serializer.save(cart=cart)
