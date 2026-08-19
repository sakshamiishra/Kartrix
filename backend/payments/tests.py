from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import razorpay

from accounts.models import Address
from orders.models import Order, OrderItem, OrderStatusHistory
from payments.models import Payment

User = get_user_model()


class PaymentAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='customer@example.com',
            password='Password123!',
            first_name='John',
            last_name='Doe'
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='Password123!',
            first_name='Jane',
            last_name='Smith'
        )

        self.address = Address.objects.create(
            user=self.user,
            full_name='John Doe',
            phone='9876543210',
            address_line_1='123 Main St',
            city='Bangalore',
            state='Karnataka',
            postal_code='560001',
            country='India'
        )

        self.order = Order.objects.create(
            user=self.user,
            address=self.address,
            order_number='EK-20260819-TEST01',
            subtotal=Decimal('1000.00'),
            discount=Decimal('0.00'),
            shipping_cost=Decimal('0.00'),
            total_amount=Decimal('1000.00'),
            status=Order.OrderStatus.PLACED,
            payment_status=Order.PaymentStatus.PENDING
        )

        self.payment = Payment.objects.create(
            order=self.order,
            payment_method=Payment.PaymentMethod.RAZORPAY,
            payment_gateway='Razorpay',
            amount=Decimal('1000.00'),
            currency='INR',
            status=Payment.PaymentStatus.PENDING
        )

        self.client = APIClient()

    def test_unauthenticated_cannot_create_razorpay_order(self):
        response = self.client.post('/api/payments/create-razorpay-order/', {'order_number': self.order.order_number})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('payments.views.razorpay.Client')
    def test_authenticated_user_can_create_razorpay_order(self, mock_razorpay_client):
        mock_instance = MagicMock()
        mock_instance.order.create.return_value = {
            'id': 'order_rzp_mock_123',
            'amount': 100000,
            'currency': 'INR',
            'status': 'created'
        }
        mock_razorpay_client.return_value = mock_instance

        self.client.force_authenticate(user=self.user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            response = self.client.post('/api/payments/create-razorpay-order/', {'order_number': self.order.order_number})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['gateway_order_id'], 'order_rzp_mock_123')
            self.assertEqual(response.data['amount'], 100000)
            self.assertEqual(response.data['currency'], 'INR')
            self.assertEqual(response.data['key_id'], 'rzp_test_mockkey')

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.gateway_order_id, 'order_rzp_mock_123')

    def test_user_cannot_create_razorpay_order_for_other_users_order(self):
        self.client.force_authenticate(user=self.other_user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            response = self.client.post('/api/payments/create-razorpay-order/', {'order_number': self.order.order_number})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('payments.views.razorpay.Client')
    def test_cannot_create_razorpay_order_for_already_paid_order(self, mock_razorpay_client):
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.save()

        self.client.force_authenticate(user=self.user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            response = self.client.post('/api/payments/create-razorpay-order/', {'order_number': self.order.order_number})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('already paid', str(response.data))

    @patch('payments.views.razorpay.Client')
    def test_verify_payment_success(self, mock_razorpay_client):
        mock_instance = MagicMock()
        mock_instance.utility.verify_payment_signature.return_value = True
        mock_razorpay_client.return_value = mock_instance

        self.payment.gateway_order_id = 'order_rzp_mock_123'
        self.payment.save()

        self.client.force_authenticate(user=self.user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            payload = {
                'order_number': self.order.order_number,
                'razorpay_payment_id': 'pay_mock_999',
                'razorpay_order_id': 'order_rzp_mock_123',
                'razorpay_signature': 'valid_mock_signature'
            }
            response = self.client.post('/api/payments/verify-razorpay-payment/', payload)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['status'], 'PAID')

            self.payment.refresh_from_db()
            self.order.refresh_from_db()
            self.assertEqual(self.payment.status, Payment.PaymentStatus.PAID)
            self.assertEqual(self.payment.transaction_id, 'pay_mock_999')
            self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)
            self.assertEqual(self.order.status, Order.OrderStatus.CONFIRMED)

    @patch('payments.views.razorpay.Client')
    def test_verify_payment_invalid_signature(self, mock_razorpay_client):
        mock_instance = MagicMock()
        mock_instance.utility.verify_payment_signature.side_effect = razorpay.errors.SignatureVerificationError('Invalid Signature')
        mock_razorpay_client.return_value = mock_instance

        self.payment.gateway_order_id = 'order_rzp_mock_123'
        self.payment.save()

        self.client.force_authenticate(user=self.user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            payload = {
                'order_number': self.order.order_number,
                'razorpay_payment_id': 'pay_mock_999',
                'razorpay_order_id': 'order_rzp_mock_123',
                'razorpay_signature': 'invalid_mock_signature'
            }
            response = self.client.post('/api/payments/verify-razorpay-payment/', payload)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

            self.payment.refresh_from_db()
            self.order.refresh_from_db()
            self.assertEqual(self.payment.status, Payment.PaymentStatus.FAILED)
            self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)

    @patch('payments.views.razorpay.Client')
    def test_verify_payment_idempotency(self, mock_razorpay_client):
        self.payment.status = Payment.PaymentStatus.PAID
        self.payment.transaction_id = 'pay_mock_999'
        self.payment.gateway_order_id = 'order_rzp_mock_123'
        self.payment.save()
        self.order.payment_status = Order.PaymentStatus.PAID
        self.order.status = Order.OrderStatus.CONFIRMED
        self.order.save()

        self.client.force_authenticate(user=self.user)
        with self.settings(RAZORPAY_KEY_ID='rzp_test_mockkey', RAZORPAY_KEY_SECRET='mocksecret'):
            payload = {
                'order_number': self.order.order_number,
                'razorpay_payment_id': 'pay_mock_999',
                'razorpay_order_id': 'order_rzp_mock_123',
                'razorpay_signature': 'valid_mock_signature'
            }
            response = self.client.post('/api/payments/verify-razorpay-payment/', payload)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('already verified', str(response.data))
