from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Category, Brand, Product, ProductVariant, Inventory
from cart.models import Cart, CartItem

User = get_user_model()


class CartAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='user1@example.com', password='Password123!')
        self.user2 = User.objects.create_user(email='user2@example.com', password='Password123!')

        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.brand = Brand.objects.create(name='Apple', slug='apple')

        self.product = Product.objects.create(
            name='iPhone 15',
            slug='iphone-15',
            category=self.category,
            brand=self.brand,
            is_active=True
        )

        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='IPHONE15-128',
            price=999.00,
            is_active=True
        )

        self.inventory = Inventory.objects.create(
            product_variant=self.variant,
            quantity=10,
            reserved_quantity=0
        )

    def test_get_cart_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertEqual(response.data['cart_subtotal'], '0.00')

    def test_get_cart_unauthenticated(self):
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_item_to_cart(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'product': self.product.id,
            'product_variant': self.variant.id,
            'quantity': 2
        }
        response = self.client.post('/api/cart/items/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantity'], 2)

        # Verify duplicate add increments quantity
        response2 = self.client.post('/api/cart/items/', data)
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.data['quantity'], 4)

    def test_add_item_exceeds_stock(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'product': self.product.id,
            'product_variant': self.variant.id,
            'quantity': 15  # Only 10 available
        }
        response = self.client.post('/api/cart/items/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_cart_item_quantity(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        item = CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        response = self.client.patch(f'/api/cart/items/{item.id}/', {'quantity': 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 5)

    def test_delete_cart_item(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        item = CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=1)

        response = self.client.delete(f'/api/cart/items/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())

    def test_cart_user_isolation(self):
        # User 2 should not see User 1's cart item
        cart1 = Cart.objects.create(user=self.user1)
        item1 = CartItem.objects.create(cart=cart1, product=self.product, product_variant=self.variant, quantity=1)

        self.client.force_authenticate(user=self.user2)
        response = self.client.get(f'/api/cart/items/{item1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_clear_cart(self):
        self.client.force_authenticate(user=self.user1)
        cart = Cart.objects.create(user=self.user1)
        CartItem.objects.create(cart=cart, product=self.product, product_variant=self.variant, quantity=2)

        response = self.client.post('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(cart.items.count(), 0)
