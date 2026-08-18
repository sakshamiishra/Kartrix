from rest_framework import serializers
from .models import WishlistItem
from products.models import Product
from products.serializers import ProductListSerializer


class WishlistItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source='product', read_only=True)

    class Meta:
        model = WishlistItem
        fields = ('id', 'user', 'product', 'product_detail', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')

    def validate_product(self, value):
        if not value.is_active:
            raise serializers.ValidationError("This product is inactive and cannot be added to wishlist.")
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            product = data.get('product')
            if WishlistItem.objects.filter(user=request.user, product=product).exists():
                raise serializers.ValidationError({"product": "Product is already in your wishlist."})
        return data
