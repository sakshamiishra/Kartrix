from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import Address
from products.models import Category, Brand, Product, ProductVariant, Inventory
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem

User = get_user_model()


class OrdersAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='user1@example.com', password='Password123!', first_name='John', last_name='Doe')
        self.user2 = User.objects.create_user(email='user2@example.com', password='Password123!', first_name='Jane', last_name='Smith')

        self.address1 = Address.objects.create(
            user=self.user1,
            full_name='John Doe',
            phone='9876543210',
            address_line_1='123 Main St',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400001',
            country='India',
            is_default=True
        )

        self.address2 = Address.objects.create(
            user=self.user2,
            full_name='Jane Smith',
            phone='9123456789',
            address_line_1='456 Park Ave',
            city='Delhi',
            state='Delhi',
            postal_code='110001',
            country='India',
            is_default=True
        )

        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.brand = Brand.objects.create(name='Apple', slug='apple')

        self.product = Product.objects.create(
            name='iPhone 15 Pro',
            slug='iphone-15-pro',
            category=self.category,
            brand=self.brand,
            is_active=True
        )

        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='IPHONE15PRO-128',
            price=Decimal('129900.00'),
            discount_price=Decimal('119900.00'),
            is_active=True
        )

        self.inventory = Inventory.objects.create(
            product_variant=self.variant,
            quantity=10,
            reserved_quantity=0
        )

    def test_successful_checkout(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=2)

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('order_number', response.data)
        self.assertEqual(response.data['status'], 'PLACED')
        self.assertEqual(response.data['payment_status'], 'PENDING')
        self.assertEqual(Decimal(response.data['subtotal']), Decimal('239800.00'))  # 119900 * 2
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('239800.00'))

        # Cart should now be empty
        cart.refresh_from_db()
        self.assertEqual(cart.items.count(), 0)

        # Order and OrderItem in DB
        order = Order.objects.get(order_number=response.data['order_number'])
        self.assertEqual(order.items.count(), 1)
        item = order.items.first()
        self.assertEqual(item.unit_price, Decimal('119900.00'))
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.subtotal, Decimal('239800.00'))

    def test_empty_cart_checkout_rejection(self):
        self.client.force_authenticate(user=self.user1)
        Cart.objects.create(user=self.user1)  # empty cart

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_checkout(self):
        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_address_checkout_rejection(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        # Trying to use User 2's address ID
        response = self.client.post('/api/orders/checkout/', {'address_id': self.address2.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_insufficient_stock_checkout_rejection(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        # Quantity 15 exceeds available stock 10
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=15)

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_product_checkout_rejection(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        # Deactivate product
        self.product.is_active = False
        self.product.save()

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_price_snapshot_integrity(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(order_number=response.data['order_number'])
        item = order.items.first()
        self.assertEqual(item.unit_price, Decimal('119900.00'))

        # Now change variant discount_price and price in catalog
        self.variant.discount_price = Decimal('149900.00')
        self.variant.price = Decimal('159900.00')
        self.variant.save()

        # Order item unit price in DB must remain original snapshot 119900.00
        item.refresh_from_db()
        self.assertEqual(item.unit_price, Decimal('119900.00'))

    def test_address_snapshot_integrity(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        response = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(order_number=response.data['order_number'])
        snapshot = order.shipping_address_snapshot
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot['city'], 'Mumbai')
        self.assertEqual(snapshot['address_line_1'], '123 Main St')

        # Update address in user profile
        self.address1.city = 'Pune'
        self.address1.address_line_1 = '789 New St'
        self.address1.save()

        # Order snapshot remains Mumbai & 123 Main St
        order.refresh_from_db()
        self.assertEqual(order.shipping_address_snapshot['city'], 'Mumbai')
        self.assertEqual(order.shipping_address_snapshot['address_line_1'], '123 Main St')

    def test_order_list_user_isolation(self):
        # Create order for user 1
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)
        self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})

        # User 2 lists orders -> Should see 0 orders
        self.client.force_authenticate(user=self.user2)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results'] if 'results' in response.data else response.data), 0)

    def test_order_detail_user_isolation(self):
        # Create order for user 1
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)
        checkout_res = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        order_number = checkout_res.data['order_number']

        # User 2 tries to fetch User 1's order detail -> 404 Not Found
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/orders/{order_number}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cod_checkout_successful(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=2)

        response = self.client.post('/api/orders/checkout/', {
            'address_id': self.address1.id,
            'payment_method': 'COD'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PLACED')
        self.assertEqual(response.data['payment_status'], 'PENDING')

        order = Order.objects.get(order_number=response.data['order_number'])
        self.assertEqual(order.payment.payment_method, 'COD')
        self.assertEqual(order.payment.status, 'PENDING')

        # Stock should be deducted for COD
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 8)  # 10 - 2

    def test_cancel_placed_order_restores_stock(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=3)

        checkout_res = self.client.post('/api/orders/checkout/', {
            'address_id': self.address1.id,
            'payment_method': 'COD'
        })
        order_number = checkout_res.data['order_number']

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 7)  # 10 - 3

        # Cancel order
        cancel_res = self.client.post(f'/api/orders/{order_number}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data['status'], 'CANCELLED')

        # Stock restored
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 10)  # 7 + 3

    def test_cancel_shipped_order_rejected(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        checkout_res = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        order_number = checkout_res.data['order_number']

        order = Order.objects.get(order_number=order_number)
        order.status = Order.OrderStatus.SHIPPED
        order.save()

        cancel_res = self.client.post(f'/api/orders/{order_number}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be cancelled', str(cancel_res.data))

    def test_non_owner_cannot_cancel_order(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        checkout_res = self.client.post('/api/orders/checkout/', {'address_id': self.address1.id})
        order_number = checkout_res.data['order_number']

        # User 2 attempts to cancel User 1's order
        self.client.force_authenticate(user=self.user2)
        cancel_res = self.client.post(f'/api/orders/{order_number}/cancel/')
        self.assertEqual(cancel_res.status_code, status.HTTP_404_NOT_FOUND)

