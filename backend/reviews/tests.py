from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User, Address
from products.models import Category, Brand, Product, ProductVariant
from orders.models import Order, OrderItem
from reviews.models import Review


class ReviewsApiTests(APITestCase):
    def setUp(self):
        # 1. Create Users
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='Password123!',
            first_name='John',
            last_name='Doe',
            is_staff=False
        )
        self.other_customer = User.objects.create_user(
            email='other@example.com',
            password='Password123!',
            first_name='Jane',
            last_name='Smith',
            is_staff=False
        )
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='Password123!',
            first_name='Staff',
            last_name='Admin',
            is_staff=True
        )

        # 2. Create Catalog Setup
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.brand = Brand.objects.create(name='TechCorp', slug='techcorp')
        self.product = Product.objects.create(
            category=self.category,
            brand=self.brand,
            name='Pro Wireless Headphones',
            slug='pro-wireless-headphones',
            description='Active Noise Cancelling',
            is_active=True
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='HEADPHONE-BLK',
            price=2999.00
        )

        self.address = Address.objects.create(
            user=self.customer,
            full_name='John Doe',
            phone='9876543210',
            address_line_1='123 Main St',
            city='Bangalore',
            state='Karnataka',
            postal_code='560001',
            country='India'
        )

        # 3. Create a Delivered & Paid Order for customer
        self.delivered_order = Order.objects.create(
            user=self.customer,
            address=self.address,
            order_number='ORD-DELIVERED-001',
            subtotal=2999.00,
            shipping_cost=0.00,
            total_amount=2999.00,
            status=Order.OrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PAID
        )
        self.order_item = OrderItem.objects.create(
            order=self.delivered_order,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=2999.00,
            quantity=1,
            subtotal=2999.00
        )

    def test_create_review_verified_purchaser_success(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-list')
        data = {
            'product': self.product.id,
            'rating': 5,
            'title': 'Excellent Headphones!',
            'comment': 'Sound quality is superb and battery life is awesome.'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Review.objects.filter(user=self.customer, product=self.product).exists())
        review = Review.objects.get(user=self.customer, product=self.product)
        self.assertTrue(review.is_verified_purchase)
        self.assertTrue(review.is_approved)

    def test_create_review_non_purchaser_forbidden(self):
        self.client.force_authenticate(user=self.other_customer)
        url = reverse('review-list')
        data = {
            'product': self.product.id,
            'rating': 4,
            'title': 'Looks good',
            'comment': 'I never bought this but want to review.'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('completed, delivered orders', str(response.data))

    def test_create_review_cancelled_order_forbidden(self):
        cancelled_order = Order.objects.create(
            user=self.other_customer,
            address=self.address,
            order_number='ORD-CANCELLED-001',
            subtotal=2999.00,
            shipping_cost=0.00,
            total_amount=2999.00,
            status=Order.OrderStatus.CANCELLED,
            payment_status=Order.PaymentStatus.PAID
        )
        OrderItem.objects.create(
            order=cancelled_order,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=2999.00,
            quantity=1,
            subtotal=2999.00
        )
        self.client.force_authenticate(user=self.other_customer)
        url = reverse('review-list')
        data = {'product': self.product.id, 'rating': 3, 'title': 'Cancelled'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_non_delivered_order_forbidden(self):
        shipped_order = Order.objects.create(
            user=self.other_customer,
            address=self.address,
            order_number='ORD-SHIPPED-001',
            subtotal=2999.00,
            shipping_cost=0.00,
            total_amount=2999.00,
            status=Order.OrderStatus.SHIPPED,
            payment_status=Order.PaymentStatus.PAID
        )
        OrderItem.objects.create(
            order=shipped_order,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=2999.00,
            quantity=1,
            subtotal=2999.00
        )
        self.client.force_authenticate(user=self.other_customer)
        url = reverse('review-list')
        data = {'product': self.product.id, 'rating': 5, 'title': 'In Transit'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_review_unpaid_order_forbidden(self):
        unpaid_order = Order.objects.create(
            user=self.other_customer,
            address=self.address,
            order_number='ORD-UNPAID-001',
            subtotal=2999.00,
            shipping_cost=0.00,
            total_amount=2999.00,
            status=Order.OrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PENDING
        )
        OrderItem.objects.create(
            order=unpaid_order,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=2999.00,
            quantity=1,
            subtotal=2999.00
        )
        self.client.force_authenticate(user=self.other_customer)
        url = reverse('review-list')
        data = {'product': self.product.id, 'rating': 5, 'title': 'Unpaid'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_duplicate_review_forbidden(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-list')
        data = {'product': self.product.id, 'rating': 5, 'title': 'First Review'}
        self.client.post(url, data, format='json')

        # Attempt second review
        response = self.client.post(url, {'product': self.product.id, 'rating': 4, 'title': 'Second Review'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already reviewed', str(response.data))

    def test_invalid_rating_value_rejected(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-list')
        response_zero = self.client.post(url, {'product': self.product.id, 'rating': 0}, format='json')
        self.assertEqual(response_zero.status_code, status.HTTP_400_BAD_REQUEST)

        response_six = self.client.post(url, {'product': self.product.id, 'rating': 6}, format='json')
        self.assertEqual(response_six.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_update_own_review(self):
        review = Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=4,
            title='Initial Title',
            comment='Initial Comment',
            is_verified_purchase=True,
            is_approved=True
        )
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-detail', args=[review.id])
        response = self.client.patch(url, {'rating': 5, 'title': 'Updated Title'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.title, 'Updated Title')

    def test_non_owner_cannot_update_review(self):
        review = Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=4,
            title='Original Title',
            is_verified_purchase=True,
            is_approved=True
        )
        self.client.force_authenticate(user=self.other_customer)
        url = reverse('review-detail', args=[review.id])
        response = self.client.patch(url, {'rating': 1, 'title': 'Hacked Title'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_own_review(self):
        review = Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=4,
            title='To be deleted',
            is_verified_purchase=True,
            is_approved=True
        )
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-detail', args=[review.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(id=review.id).exists())

    def test_staff_can_delete_any_review(self):
        review = Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=4,
            title='Spam review',
            is_verified_purchase=True,
            is_approved=True
        )
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('review-detail', args=[review.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(id=review.id).exists())

    def test_unauthenticated_user_cannot_create_or_modify(self):
        url = reverse('review-list')
        post_res = self.client.post(url, {'product': self.product.id, 'rating': 5}, format='json')
        self.assertEqual(post_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rating_aggregation_accuracy(self):
        # Create second customer & order
        order2 = Order.objects.create(
            user=self.other_customer,
            address=self.address,
            order_number='ORD-DELIVERED-002',
            subtotal=2999.00,
            shipping_cost=0.00,
            total_amount=2999.00,
            status=Order.OrderStatus.DELIVERED,
            payment_status=Order.PaymentStatus.PAID
        )
        item2 = OrderItem.objects.create(
            order=order2,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=2999.00,
            quantity=1,
            subtotal=2999.00
        )

        # Review 1: Rating 5
        Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=5,
            is_verified_purchase=True,
            is_approved=True
        )
        # Review 2: Rating 3
        Review.objects.create(
            user=self.other_customer,
            product=self.product,
            order_item=item2,
            rating=3,
            is_verified_purchase=True,
            is_approved=True
        )

        # Test summary endpoint
        summary_url = reverse('review-summary') + f'?product={self.product.id}'
        res = self.client.get(summary_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_reviews'], 2)
        self.assertEqual(res.data['average_rating'], 4.0)

        # Test Product detail endpoint includes dynamic average_rating & review_count
        product_detail_url = reverse('product-detail', args=[self.product.slug])
        prod_res = self.client.get(product_detail_url)
        self.assertEqual(prod_res.status_code, status.HTTP_200_OK)
        self.assertEqual(prod_res.data['average_rating'], 4.0)
        self.assertEqual(prod_res.data['review_count'], 2)

    def test_unapproved_review_hidden_from_public(self):
        Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=1,
            title='Pending moderation',
            is_verified_purchase=True,
            is_approved=False
        )

        # Unauthenticated query
        url = reverse('review-list') + f'?product={self.product.id}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
