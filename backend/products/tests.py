from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from products.models import (
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


class ProductsCatalogTests(APITestCase):
    def setUp(self):
        # Create test users inside isolated test DB
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='Password123!',
            first_name='Regular',
            last_name='Customer',
            is_staff=False
        )
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='StaffPassword123!',
            first_name='Staff',
            last_name='Admin',
            is_staff=True
        )

        # Create active category & brand
        self.category_elec = Category.objects.create(name='Electronics', slug='electronics', is_active=True)
        self.category_inactive = Category.objects.create(name='Secret Category', slug='secret-category', is_active=False)

        self.brand_nike = Brand.objects.create(name='Nike', slug='nike', is_active=True)
        self.brand_inactive = Brand.objects.create(name='Secret Brand', slug='secret-brand', is_active=False)

        # Create active and inactive products
        self.product_active = Product.objects.create(
            category=self.category_elec,
            brand=self.brand_nike,
            name='Smartphone Pro',
            slug='smartphone-pro',
            description='High-end smartphone with OLED screen',
            is_active=True
        )
        self.product_inactive = Product.objects.create(
            category=self.category_elec,
            brand=self.brand_nike,
            name='Draft Phone',
            slug='draft-phone',
            description='Unreleased prototype phone',
            is_active=False
        )

        # Create image for active product
        self.image_primary = ProductImage.objects.create(
            product=self.product_active,
            image='products/test_phone.jpg',
            alt_text='Phone Front',
            is_primary=True
        )

        # Create variant for active product
        self.variant_128gb = ProductVariant.objects.create(
            product=self.product_active,
            sku='SM-PRO-128GB',
            price=699.99,
            discount_price=649.99,
            is_active=True
        )

        # Create inventory for variant
        self.inventory_128gb = Inventory.objects.create(
            product_variant=self.variant_128gb,
            quantity=50,
            reserved_quantity=5,
            reorder_level=10
        )

        self.category_list_url = reverse('category-list')
        self.brand_list_url = reverse('brand-list')
        self.product_list_url = reverse('product-list')
        self.product_detail_url = reverse('product-detail', kwargs={'pk': self.product_active.slug})
        self.inventory_list_url = reverse('inventory-list')
        self.transaction_list_url = reverse('inventory-transaction-list')

    # 1. Public category & brand access & inactive item hiding
    def test_public_category_access_hides_inactive(self):
        response = self.client.get(self.category_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Public gets only active category
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], 'electronics')

    def test_public_brand_access_hides_inactive(self):
        response = self.client.get(self.brand_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], 'nike')

    def test_public_product_list_access_hides_inactive(self):
        response = self.client.get(self.product_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['slug'], 'smartphone-pro')
        self.assertEqual(results[0]['starting_price'], '649.99')

    # 2. Product detail representation with images, variants, stock
    def test_public_product_detail(self):
        response = self.client.get(self.product_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Smartphone Pro')
        self.assertEqual(len(response.data['images']), 1)
        self.assertEqual(len(response.data['variants']), 1)
        self.assertEqual(response.data['variants'][0]['inventory']['available_stock'], 45)

    # 3. Filtering by category, brand, search, and price range
    def test_product_filtering_by_category_slug(self):
        response = self.client.get(self.product_list_url, {'category': 'electronics'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

        response_empty = self.client.get(self.product_list_url, {'category': 'non-existent'})
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_empty.data['results']), 0)

    def test_product_filtering_by_brand_slug(self):
        response = self.client.get(self.product_list_url, {'brand': 'nike'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_product_search(self):
        response = self.client.get(self.product_list_url, {'search': 'OLED'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

        response_nomatch = self.client.get(self.product_list_url, {'search': 'nonexistentterm'})
        self.assertEqual(response_nomatch.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_nomatch.data['results']), 0)

    def test_product_price_range_filtering(self):
        response_in_range = self.client.get(self.product_list_url, {'min_price': '600', 'max_price': '800'})
        self.assertEqual(response_in_range.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_in_range.data['results']), 1)

        response_out_range = self.client.get(self.product_list_url, {'min_price': '1000'})
        self.assertEqual(response_out_range.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_out_range.data['results']), 0)

    # 4. Pagination
    def test_pagination_structure(self):
        response = self.client.get(self.product_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)

    # 5. Non-staff write rejection (401/403)
    def test_non_staff_category_creation_rejected(self):
        data = {'name': 'Laptops', 'slug': 'laptops', 'description': 'Computers'}
        # Unauthenticated
        resp_unauth = self.client.post(self.category_list_url, data)
        self.assertEqual(resp_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer authenticated
        self.client.force_authenticate(user=self.customer_user)
        resp_customer = self.client.post(self.category_list_url, data)
        self.assertEqual(resp_customer.status_code, status.HTTP_403_FORBIDDEN)

    # 6. Admin category & product management
    def test_admin_category_creation_and_update(self):
        self.client.force_authenticate(user=self.staff_user)
        data = {'name': 'Laptops', 'slug': 'laptops', 'description': 'Laptops & PCs'}
        resp_create = self.client.post(self.category_list_url, data)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_create.data['slug'], 'laptops')

        category_id = resp_create.data['id']
        detail_url = reverse('category-detail', kwargs={'pk': category_id})
        resp_update = self.client.patch(detail_url, {'description': 'Updated Description'})
        self.assertEqual(resp_update.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_update.data['description'], 'Updated Description')

    def test_admin_product_creation(self):
        self.client.force_authenticate(user=self.staff_user)
        product_data = {
            'category': self.category_elec.id,
            'brand': self.brand_nike.id,
            'name': 'Wireless Headphones',
            'slug': 'wireless-headphones',
            'description': 'Noise cancelling headphones',
            'sku': 'HEAD-W-01',
            'is_active': True
        }
        response = self.client.post(self.product_list_url, product_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'wireless-headphones')

    # 7. Admin inventory operations & transaction attribution
    def test_inventory_transaction_user_attribution_and_stock_update(self):
        self.client.force_authenticate(user=self.staff_user)
        initial_qty = self.inventory_128gb.quantity

        tx_data = {
            'inventory': self.inventory_128gb.id,
            'transaction_type': 'RESTOCK',
            'quantity': 20,
            'reference': 'RESTOCK-BATCH-001'
        }
        response = self.client.post(self.transaction_list_url, tx_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['created_by_email'], self.staff_user.email)

        # Check inventory quantity was increased by 20
        self.inventory_128gb.refresh_from_db()
        self.assertEqual(self.inventory_128gb.quantity, initial_qty + 20)
