from rest_framework import serializers
from django.db import transaction
from .models import Review, ReviewImage
from products.models import Product
from orders.models import OrderItem, Order


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ('id', 'image', 'created_at')


class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id',
            'user',
            'user_email',
            'user_name',
            'product',
            'product_name',
            'order_item',
            'rating',
            'title',
            'comment',
            'is_verified_purchase',
            'is_approved',
            'images',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'user',
            'is_verified_purchase',
            'is_approved',
            'created_at',
            'updated_at',
        )

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        if full_name:
            return full_name
        return obj.user.email.split('@')[0]


class ReviewCreateSerializer(serializers.ModelSerializer):
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        required=False,
        write_only=True
    )

    class Meta:
        model = Review
        fields = ('product', 'rating', 'title', 'comment', 'uploaded_images')

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        product = attrs.get('product')

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        # 1. Check for existing review by this user for this product
        if Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("You have already reviewed this product.")

        # 2. Check for delivered, paid OrderItem owned by user
        delivered_item = OrderItem.objects.filter(
            order__user=user,
            product=product,
            order__status=Order.OrderStatus.DELIVERED,
            order__payment_status=Order.PaymentStatus.PAID
        ).first()

        if not delivered_item:
            raise serializers.ValidationError("You can only review products from completed, delivered orders.")

        attrs['delivered_item'] = delivered_item
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        uploaded_images = validated_data.pop('uploaded_images', [])
        delivered_item = validated_data.pop('delivered_item')

        review = Review.objects.create(
            user=user,
            product=validated_data['product'],
            order_item=delivered_item,
            rating=validated_data['rating'],
            title=validated_data.get('title', ''),
            comment=validated_data.get('comment', ''),
            is_verified_purchase=True,
            is_approved=True
        )

        for img in uploaded_images:
            ReviewImage.objects.create(review=review, image=img)

        return review


class ReviewUpdateSerializer(serializers.ModelSerializer):
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        required=False,
        write_only=True
    )

    class Meta:
        model = Review
        fields = ('rating', 'title', 'comment', 'uploaded_images')

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])

        instance.rating = validated_data.get('rating', instance.rating)
        instance.title = validated_data.get('title', instance.title)
        instance.comment = validated_data.get('comment', instance.comment)
        instance.save()

        for img in uploaded_images:
            ReviewImage.objects.create(review=instance, image=img)

        return instance
