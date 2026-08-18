from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WishlistItem
from .serializers import WishlistItemSerializer
from products.models import Product


class WishlistItemViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WishlistItemSerializer

    def get_queryset(self):
        return WishlistItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'product_id': 'Product ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, ValueError):
            return Response({'product_id': 'Invalid product ID.'}, status=status.HTTP_404_NOT_FOUND)

        if not product.is_active:
            return Response({'detail': 'Product is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = WishlistItem.objects.filter(user=request.user, product=product).first()
        if existing:
            existing.delete()
            return Response({'in_wishlist': False, 'detail': 'Removed from wishlist.'}, status=status.HTTP_200_OK)
        else:
            WishlistItem.objects.create(user=request.user, product=product)
            return Response({'in_wishlist': True, 'detail': 'Added to wishlist.'}, status=status.HTTP_201_CREATED)
