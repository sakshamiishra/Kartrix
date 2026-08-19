from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            'id',
            'order',
            'payment_method',
            'payment_gateway',
            'transaction_id',
            'amount',
            'currency',
            'status',
            'gateway_order_id',
            'gateway_payment_id',
            'paid_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class CreateRazorpayOrderSerializer(serializers.Serializer):
    order_number = serializers.CharField(required=True)


class VerifyRazorpayPaymentSerializer(serializers.Serializer):
    order_number = serializers.CharField(required=True)
    razorpay_payment_id = serializers.CharField(required=True)
    razorpay_order_id = serializers.CharField(required=True)
    razorpay_signature = serializers.CharField(required=True)
