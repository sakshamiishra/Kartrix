from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory, Coupon
from accounts.models import Address
from accounts.serializers import AddressSerializer
from payments.serializers import PaymentSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            'id',
            'order',
            'product',
            'product_variant',
            'product_name',
            'unit_price',
            'quantity',
            'subtotal',
        )
        read_only_fields = fields


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = (
            'id',
            'status',
            'note',
            'changed_by',
            'created_at',
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    address_detail = AddressSerializer(source='address', read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            'id',
            'user',
            'address',
            'address_detail',
            'shipping_address_snapshot',
            'order_number',
            'subtotal',
            'discount',
            'shipping_cost',
            'total_amount',
            'status',
            'payment_status',
            'payment',
            'items',
            'status_history',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(required=True)
    payment_method = serializers.ChoiceField(choices=['RAZORPAY', 'COD'], default='RAZORPAY', required=False)

    def validate_address_id(self, value):
        user = self.context['request'].user
        try:
            address = Address.objects.get(id=value, user=user)
        except Address.DoesNotExist:
            raise serializers.ValidationError("Selected address does not exist or does not belong to your account.")
        return value



class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            'id',
            'code',
            'description',
            'discount_type',
            'discount_value',
            'minimum_order_amount',
            'maximum_discount',
            'usage_limit',
            'used_count',
            'valid_from',
            'valid_until',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'used_count', 'created_at', 'updated_at')


