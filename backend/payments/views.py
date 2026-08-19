from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
import razorpay

from orders.models import Order, OrderStatusHistory
from .models import Payment
from .serializers import (
    PaymentSerializer,
    CreateRazorpayOrderSerializer,
    VerifyRazorpayPaymentSerializer
)


class CreateRazorpayOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateRazorpayOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_number = serializer.validated_data['order_number']
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise ValidationError({"detail": "Order not found or access denied."})

        if order.payment_status == Order.PaymentStatus.PAID:
            raise ValidationError({"detail": "Order is already paid."})

        if order.status == Order.OrderStatus.CANCELLED:
            raise ValidationError({"detail": "Order has been cancelled."})

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        if not key_id or not key_secret:
            raise ValidationError({"detail": "Razorpay test key credentials are not configured on the server."})

        # Server-side authoritative amount in paise
        amount_in_paise = int(order.total_amount * Decimal('100'))

        client = razorpay.Client(auth=(key_id, key_secret))
        
        try:
            rz_order = client.order.create({
                'amount': amount_in_paise,
                'currency': 'INR',
                'receipt': str(order.order_number),
                'notes': {
                    'order_number': order.order_number,
                    'user_id': str(request.user.id),
                }
            })
        except Exception as e:
            raise ValidationError({"detail": f"Failed to create Razorpay order: {str(e)}"})

        with transaction.atomic():
            payment, _ = Payment.objects.update_or_create(
                order=order,
                defaults={
                    'payment_method': Payment.PaymentMethod.RAZORPAY,
                    'payment_gateway': 'Razorpay',
                    'amount': order.total_amount,
                    'currency': 'INR',
                    'status': Payment.PaymentStatus.PENDING,
                    'gateway_order_id': rz_order['id'],
                }
            )

        return Response({
            'key_id': key_id,
            'gateway_order_id': rz_order['id'],
            'amount': amount_in_paise,
            'currency': 'INR',
            'order_number': order.order_number,
            'payment_id': payment.id
        }, status=status.HTTP_200_OK)


class VerifyRazorpayPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VerifyRazorpayPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_number = serializer.validated_data['order_number']
        razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
        razorpay_order_id = serializer.validated_data['razorpay_order_id']
        razorpay_signature = serializer.validated_data['razorpay_signature']

        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise ValidationError({"detail": "Order not found or access denied."})

        payment = Payment.objects.filter(order=order).first()
        if not payment:
            raise ValidationError({"detail": "No payment record found for this order."})

        # Idempotency check: if already paid with same payment ID
        if payment.status == Payment.PaymentStatus.PAID and payment.transaction_id == razorpay_payment_id:
            return Response({
                'detail': 'Payment already verified successfully.',
                'status': 'PAID',
                'order_number': order.order_number
            }, status=status.HTTP_200_OK)

        # Mismatch check: verify razorpay_order_id matches payment.gateway_order_id
        if payment.gateway_order_id and payment.gateway_order_id != razorpay_order_id:
            raise ValidationError({"detail": "Razorpay order ID mismatch."})

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        if not key_id or not key_secret:
            raise ValidationError({"detail": "Razorpay test key credentials are not configured on the server."})

        client = razorpay.Client(auth=(key_id, key_secret))

        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }

        try:
            client.utility.verify_payment_signature(params_dict)
        except razorpay.errors.SignatureVerificationError:
            payment.status = Payment.PaymentStatus.FAILED
            payment.save(update_fields=['status', 'updated_at'])
            raise ValidationError({"detail": "Razorpay payment signature verification failed."})
        except Exception as e:
            payment.status = Payment.PaymentStatus.FAILED
            payment.save(update_fields=['status', 'updated_at'])
            raise ValidationError({"detail": f"Payment verification error: {str(e)}"})

        with transaction.atomic():
            now = timezone.now()
            payment.status = Payment.PaymentStatus.PAID
            payment.gateway_payment_id = razorpay_payment_id
            payment.gateway_signature = razorpay_signature
            payment.transaction_id = razorpay_payment_id
            payment.paid_at = now
            payment.save()

            order.payment_status = Order.PaymentStatus.PAID
            order.status = Order.OrderStatus.CONFIRMED
            order.save(update_fields=['payment_status', 'status', 'updated_at'])

            OrderStatusHistory.objects.create(
                order=order,
                status=Order.OrderStatus.CONFIRMED,
                note=f"Razorpay payment verified successfully (Payment ID: {razorpay_payment_id}).",
                changed_by=request.user
            )

        return Response({
            'detail': 'Payment verified successfully.',
            'status': 'PAID',
            'order_number': order.order_number
        }, status=status.HTTP_200_OK)
