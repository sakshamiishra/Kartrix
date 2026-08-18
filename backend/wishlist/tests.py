from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Category, Brand, Product
from wishlist.models import WishlistItem

User = get_user_model()


class WishlistAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='user1@example.com', password='Password123!')
        self.user2 = User.objects.create_user(email='user2@example.com', password='Password123!')

        self.category = Category.objects.create(name='Clothing', slug='clothing')
        self.brand = Brand.objects.create(name='Nike', slug='nike')

        self.product = Product.objects.create(
            name='Air Max',
            slug='air-max',
            category=self.category,
            brand=self.brand,
            is_active=True
        )

    def test_list_wishlist_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        WishlistItem.objects.create(user=self.user1, product=self.product)

        response = self.client.get('/api/wishlist/items/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_toggle_wishlist_add_and_remove(self):
        self.client.force_authenticate(user=self.user1)

        # Toggle Add
        response = self.client.post('/api/wishlist/toggle/', {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['in_wishlist'])
        self.assertTrue(WishlistItem.objects.filter(user=self.user1, product=self.product).exists())

        # Toggle Remove
        response2 = self.client.post('/api/wishlist/toggle/', {'product_id': self.product.id})
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertFalse(response2.data['in_wishlist'])
        self.assertFalse(WishlistItem.objects.filter(user=self.user1, product=self.product).exists())

    def test_add_duplicate_wishlist_item_serializer_error(self):
        self.client.force_authenticate(user=self.user1)
        WishlistItem.objects.create(user=self.user1, product=self.product)

        response = self.client.post('/api/wishlist/items/', {'product': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wishlist_user_isolation(self):
        item = WishlistItem.objects.create(user=self.user1, product=self.product)

        self.client.force_authenticate(user=self.user2)
        response = self.client.delete(f'/api/wishlist/items/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
