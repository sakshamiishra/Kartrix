from rest_framework import serializers
from django.db import transaction
from .models import (
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


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'image', 'is_active', 'created_at', 'updated_at')


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name', 'slug', 'description', 'logo', 'is_active', 'created_at', 'updated_at')


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'product', 'image', 'alt_text', 'is_primary', 'display_order', 'created_at')


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ('id', 'name')


class AttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)

    class Meta:
        model = AttributeValue
        fields = ('id', 'attribute', 'attribute_name', 'value')


class InventorySerializer(serializers.ModelSerializer):
    available_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inventory
        fields = ('id', 'product_variant', 'quantity', 'reserved_quantity', 'available_stock', 'reorder_level', 'updated_at')
        read_only_fields = ('available_stock', 'updated_at')

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value

    def validate_reserved_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Reserved quantity cannot be negative.")
        return value


class InventoryTransactionSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = ('id', 'inventory', 'transaction_type', 'quantity', 'reference', 'created_by', 'created_by_email', 'created_at')
        read_only_fields = ('id', 'created_by', 'created_at')

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user if user.is_authenticated else None
        tx = super().create(validated_data)
        
        # Apply quantity adjustment to inventory
        inv = tx.inventory
        tx_type = tx.transaction_type
        qty = tx.quantity

        if tx_type in [InventoryTransaction.TransactionType.PURCHASE, InventoryTransaction.TransactionType.RESTOCK, InventoryTransaction.TransactionType.RETURN]:
            inv.quantity += qty
        elif tx_type in [InventoryTransaction.TransactionType.SALE, InventoryTransaction.TransactionType.ADJUSTMENT]:
            inv.quantity -= qty
        elif tx_type == InventoryTransaction.TransactionType.RESERVATION:
            inv.reserved_quantity += qty
        elif tx_type == InventoryTransaction.TransactionType.RELEASE:
            inv.reserved_quantity = max(0, inv.reserved_quantity - qty)

        inv.save()
        return tx


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values_detail = AttributeValueSerializer(source='attribute_values', many=True, read_only=True)
    inventory = InventorySerializer(read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            'id',
            'product',
            'sku',
            'price',
            'discount_price',
            'attribute_values',
            'attribute_values_detail',
            'inventory',
            'is_active',
            'created_at',
        )

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_discount_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Discount price cannot be negative.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    starting_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'category',
            'brand',
            'sku',
            'primary_image',
            'starting_price',
            'average_rating',
            'review_count',
            'is_active',
            'created_at',
        )

    def get_primary_image(self, obj):
        primary = obj.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.images.first()
        if primary and primary.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary.image.url)
            return primary.image.url
        return None

    def get_starting_price(self, obj):
        active_variants = obj.variants.filter(is_active=True)
        if active_variants.exists():
            min_variant = min(active_variants, key=lambda v: v.discount_price if v.discount_price else v.price)
            price = min_variant.discount_price if min_variant.discount_price else min_variant.price
            return str(price)
        return None

    def get_average_rating(self, obj):
        if hasattr(obj, 'average_rating') and obj.average_rating is not None:
            return round(float(obj.average_rating), 1)
        from reviews.models import Review
        from django.db.models import Avg
        val = Review.objects.filter(product=obj, is_approved=True).aggregate(avg=Avg('rating'))['avg']
        return round(float(val), 1) if val else 0.0

    def get_review_count(self, obj):
        if hasattr(obj, 'review_count') and obj.review_count is not None:
            return obj.review_count
        from reviews.models import Review
        return Review.objects.filter(product=obj, is_approved=True).count()


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'category',
            'brand',
            'sku',
            'images',
            'variants',
            'average_rating',
            'review_count',
            'is_active',
            'created_at',
            'updated_at',
        )

    def get_average_rating(self, obj):
        if hasattr(obj, 'average_rating') and obj.average_rating is not None:
            return round(float(obj.average_rating), 1)
        from reviews.models import Review
        from django.db.models import Avg
        val = Review.objects.filter(product=obj, is_approved=True).aggregate(avg=Avg('rating'))['avg']
        return round(float(val), 1) if val else 0.0

    def get_review_count(self, obj):
        if hasattr(obj, 'review_count') and obj.review_count is not None:
            return obj.review_count
        from reviews.models import Review
        return Review.objects.filter(product=obj, is_approved=True).count()



class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            'id',
            'category',
            'brand',
            'name',
            'slug',
            'description',
            'sku',
            'is_active',
        )
