from rest_framework import serializers
from .models import Cart, CartItem
from products.models import Product, ProductVariant
from products.serializers import ProductListSerializer, ProductVariantSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source='product', read_only=True)
    product_variant_detail = ProductVariantSerializer(source='product_variant', read_only=True)
    unit_price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            'id',
            'cart',
            'product',
            'product_detail',
            'product_variant',
            'product_variant_detail',
            'quantity',
            'unit_price',
            'subtotal',
            'added_at',
        )
        read_only_fields = ('id', 'cart', 'added_at')

    def get_unit_price(self, obj):
        if obj.product_variant:
            variant = obj.product_variant
            price = variant.discount_price if variant.discount_price is not None else variant.price
            return str(price)
        if obj.product:
            active_variants = obj.product.variants.filter(is_active=True)
            if active_variants.exists():
                min_v = min(active_variants, key=lambda v: v.discount_price if v.discount_price is not None else v.price)
                price = min_v.discount_price if min_v.discount_price is not None else min_v.price
                return str(price)
        return "0.00"

    def get_subtotal(self, obj):
        unit_p = float(self.get_unit_price(obj))
        return f"{unit_p * obj.quantity:.2f}"

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0.")
        return value

    def validate(self, data):
        product = data.get('product')
        product_variant = data.get('product_variant')
        quantity = data.get('quantity', 1)

        if product_variant and not product:
            product = product_variant.product
            data['product'] = product

        if product and not product.is_active:
            raise serializers.ValidationError({"product": "This product is inactive and cannot be added to cart."})

        if product_variant:
            if not product_variant.is_active:
                raise serializers.ValidationError({"product_variant": "This product variant is inactive."})
            if hasattr(product_variant, 'inventory') and product_variant.inventory:
                inv = product_variant.inventory
                if quantity > inv.available_stock:
                    raise serializers.ValidationError({
                        "quantity": f"Requested quantity ({quantity}) exceeds available stock ({inv.available_stock})."
                    })

        return data


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    cart_subtotal = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'cart_subtotal', 'total_items', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def get_cart_subtotal(self, obj):
        total = 0.0
        for item in obj.items.all():
            if item.product and item.product.is_active:
                unit_p = float(CartItemSerializer().get_unit_price(item))
                total += unit_p * item.quantity
        return f"{total:.2f}"

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())
