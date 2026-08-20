from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Address
from products.models import Category, Brand, Product, ProductVariant, ProductAttribute, AttributeValue, Inventory, InventoryTransaction
from orders.models import Order, OrderItem, OrderStatusHistory, Coupon
from payments.models import Payment
from reviews.models import Review


class AdminAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='password123',
            first_name='John',
            last_name='Doe'
        )
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            password='password123',
            first_name='Staff',
            last_name='User',
            is_staff=True
        )
        self.superuser = User.objects.create_superuser(
            email='admin@example.com',
            password='password123',
            first_name='Super',
            last_name='Admin'
        )

        # Catalog setup
        self.category = Category.objects.create(name='Electronics', slug='electronics')
        self.brand = Brand.objects.create(name='TechCorp', slug='techcorp')
        self.product = Product.objects.create(
            name='Smartphone Pro',
            slug='smartphone-pro',
            category=self.category,
            brand=self.brand,
            is_active=True
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='SP-PRO-128',
            price=Decimal('49999.00')
        )
        self.inventory = Inventory.objects.create(
            product_variant=self.variant,
            quantity=50,
            reserved_quantity=0,
            reorder_level=5
        )

        # Order setup
        self.address = Address.objects.create(
            user=self.customer,
            full_name='John Doe',
            phone='9876543210',
            address_line_1='123 Main St',
            city='Mumbai',
            state='Maharashtra',
            postal_code='400001',
            country='India'
        )
        self.order = Order.objects.create(
            user=self.customer,
            address=self.address,
            order_number='EK-20260820-111111',
            subtotal=Decimal('49999.00'),
            shipping_cost=Decimal('0.00'),
            total_amount=Decimal('49999.00'),
            status=Order.OrderStatus.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            product=self.product,
            product_variant=self.variant,
            product_name=self.product.name,
            unit_price=self.variant.price,
            quantity=1,
            subtotal=self.variant.price
        )
        self.payment = Payment.objects.create(
            order=self.order,
            payment_method=Payment.PaymentMethod.RAZORPAY,
            status=Payment.PaymentStatus.PAID,
            amount=Decimal('49999.00')
        )

        # Review setup
        self.review = Review.objects.create(
            user=self.customer,
            product=self.product,
            order_item=self.order_item,
            rating=5,
            title='Great Phone!',
            comment='Super fast and clear display.',
            is_verified_purchase=True,
            is_approved=False
        )

    def test_unauthenticated_admin_api_denied(self):
        url = reverse('admin-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_admin_api_denied(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('admin-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_admin_dashboard_allowed(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_orders', response.data)
        self.assertIn('total_revenue', response.data)

    def test_staff_order_valid_status_transition(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-order-update-status', kwargs={'order_number': self.order.order_number})
        response = self.client.post(url, {'status': Order.OrderStatus.PROCESSING, 'note': 'Processing in warehouse'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.OrderStatus.PROCESSING)
        self.assertTrue(OrderStatusHistory.objects.filter(order=self.order, status=Order.OrderStatus.PROCESSING).exists())

    def test_staff_order_invalid_status_transition_rejected(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-order-update-status', kwargs={'order_number': self.order.order_number})
        # Invalid: CONFIRMED directly to DELIVERED is not allowed
        response = self.client.post(url, {'status': Order.OrderStatus.DELIVERED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_staff_order_cancellation_restores_inventory(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-order-update-status', kwargs={'order_number': self.order.order_number})
        initial_qty = self.inventory.quantity
        response = self.client.post(url, {'status': Order.OrderStatus.CANCELLED}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, initial_qty + 1)
        self.assertTrue(InventoryTransaction.objects.filter(inventory=self.inventory, transaction_type=InventoryTransaction.TransactionType.RESTOCK).exists())

    def test_staff_cannot_promote_user_to_staff(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-user-toggle-staff', kwargs={'pk': self.customer.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_can_promote_user_to_staff(self):
        self.client.force_authenticate(user=self.superuser)
        url = reverse('admin-user-toggle-staff', kwargs={'pk': self.customer.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_staff)

    def test_record_refund_invalid_on_pending_payment(self):
        pending_order = Order.objects.create(
            user=self.customer,
            address=self.address,
            order_number='EK-20260820-222222',
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            status=Order.OrderStatus.PLACED,
            payment_status=Order.PaymentStatus.PENDING
        )
        pending_payment = Payment.objects.create(
            order=pending_order,
            payment_method=Payment.PaymentMethod.RAZORPAY,
            status=Payment.PaymentStatus.PENDING,
            amount=Decimal('100.00')
        )
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-payment-record-refund', kwargs={'pk': pending_payment.id})
        response = self.client.post(url, {'note': 'Test refund'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_toggle_approval(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-review-toggle-approval', kwargs={'pk': self.review.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.review.refresh_from_db()
        self.assertTrue(self.review.is_approved)

    def test_stock_adjustment(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-inventory-adjust-stock')
        response = self.client.post(url, {
            'inventory_id': self.inventory.id,
            'quantity_change': 15,
            'transaction_type': 'RESTOCK',
            'note': 'Received new shipment'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 65)

    def test_create_brand_auto_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-brand-list')
        response = self.client.post(url, {'name': 'Auto Slug Brand', 'slug': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'auto-slug-brand')

    def test_create_brand_explicit_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-brand-list')
        response = self.client.post(url, {'name': 'Custom Brand', 'slug': 'my-custom-brand'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'my-custom-brand')

    def test_create_category_auto_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-category-list')
        response = self.client.post(url, {'name': 'Mobile Accessories', 'slug': ''}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'mobile-accessories')

    def test_create_category_explicit_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-category-list')
        response = self.client.post(url, {'name': 'Home Appliances', 'slug': 'appliances-home'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'appliances-home')

    def test_create_brand_duplicate_slug_rejected(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-brand-list')
        # Brand with slug='techcorp' already created in setUp()
        response = self.client.post(url, {'name': 'TechCorp Duplicate', 'slug': 'techcorp'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('slug', response.data)

    def test_create_product_auto_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-list')
        response = self.client.post(url, {
            'name': 'Wireless Noise Cancelling Headphones',
            'slug': '',
            'category': self.category.id,
            'brand': self.brand.id,
            'description': 'Premium ANC Headphones',
            'is_active': True
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'wireless-noise-cancelling-headphones')

    def test_create_product_explicit_slug(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-list')
        response = self.client.post(url, {
            'name': 'Flagship Tablet',
            'slug': 'custom-flagship-tablet-slug',
            'category_id': self.category.id,
            'brand_id': self.brand.id,
            'description': '12-inch Display Tablet',
            'is_active': True
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'custom-flagship-tablet-slug')

    def test_create_product_duplicate_slug_rejected(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-list')
        # Product with slug='smartphone-pro' already created in setUp()
        response = self.client.post(url, {
            'name': 'Smartphone Pro Duplicate',
            'slug': 'smartphone-pro',
            'category': self.category.id,
            'brand': self.brand.id,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('slug', response.data)

    def test_create_variant_success(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-create-variant', kwargs={'pk': self.product.id})
        response = self.client.post(url, {
            'sku': 'SP-PRO-256-WHITE',
            'name': 'white',
            'price': 5000.00,
            'discount_price': 4555.00
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sku'], 'SP-PRO-256-WHITE')
        self.assertEqual(response.data['name'], 'white')
        self.assertEqual(Decimal(response.data['price']), Decimal('5000.00'))
        self.assertEqual(Decimal(response.data['discount_price']), Decimal('4555.00'))
        # Verify Inventory record auto-created
        created_variant = ProductVariant.objects.get(sku='SP-PRO-256-WHITE')
        self.assertTrue(Inventory.objects.filter(product_variant=created_variant).exists())

    def test_create_variant_missing_required_fields(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-create-variant', kwargs={'pk': self.product.id})
        # Missing SKU and price
        response = self.client.post(url, {
            'name': 'white',
            'discount_price': 4555.00
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sku', response.data)
        self.assertIn('price', response.data)

    def test_create_variant_invalid_discount_price(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-create-variant', kwargs={'pk': self.product.id})
        # Discount price higher than regular price
        response = self.client.post(url, {
            'sku': 'SP-PRO-INVALID',
            'price': 5000.00,
            'discount_price': 6000.00
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('discount_price', response.data)

    def test_create_variant_duplicate_sku_rejected(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-create-variant', kwargs={'pk': self.product.id})
        # SKU 'SP-PRO-128' already created in setUp()
        response = self.client.post(url, {
            'sku': 'SP-PRO-128',
            'price': 5000.00
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sku', response.data)

    def test_create_variant_with_initial_stock(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-create-variant', kwargs={'pk': self.product.id})
        response = self.client.post(url, {
            'sku': 'SP-PRO-512-BLUE',
            'name': 'blue',
            'price': 60000.00,
            'initial_stock': 25
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        variant = ProductVariant.objects.get(sku='SP-PRO-512-BLUE')
        self.assertEqual(variant.inventory.quantity, 25)

    def test_update_variant_success(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-product-update-variant', kwargs={'pk': self.product.id, 'variant_id': self.variant.id})
        response = self.client.patch(url, {
            'sku': 'SP-PRO-128-UPDATED',
            'price': 45000.00,
            'discount_price': 42000.00
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.sku, 'SP-PRO-128-UPDATED')
        self.assertEqual(self.variant.price, Decimal('45000.00'))

    def test_product_list_and_detail_counts_and_stock(self):
        self.client.force_authenticate(user=self.staff_user)
        # Add a second variant to self.product (setUp variant has quantity=50)
        v2 = ProductVariant.objects.create(
            product=self.product,
            sku='SP-PRO-256-RED',
            price=Decimal('55000.00')
        )
        Inventory.objects.create(product_variant=v2, quantity=30)

        # Test list endpoint
        url_list = reverse('admin-product-list')
        res_list = self.client.get(url_list)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        results = res_list.data['results'] if isinstance(res_list.data, dict) else res_list.data
        prod_data = next(p for p in results if p['id'] == self.product.id)
        self.assertEqual(prod_data['variant_count'], 2)
        self.assertEqual(prod_data['total_stock'], 80)

        # Test detail endpoint
        url_detail = reverse('admin-product-detail', kwargs={'pk': self.product.id})
        res_detail = self.client.get(url_detail)
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(res_detail.data['variant_count'], 2)
        self.assertEqual(res_detail.data['total_stock'], 80)

    def test_brand_categories_m2m(self):
        self.client.force_authenticate(user=self.staff_user)
        c2 = Category.objects.create(name='Footwear', slug='footwear')
        url = reverse('admin-brand-detail', kwargs={'pk': self.brand.id})
        response = self.client.patch(url, {
            'categories': [self.category.id, c2.id]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.brand.refresh_from_db()
        self.assertEqual(set(self.brand.categories.values_list('id', flat=True)), {self.category.id, c2.id})

    def test_create_product_invalid_brand_category_combination_rejected(self):
        self.client.force_authenticate(user=self.staff_user)
        # Link self.brand strictly to self.category ('Electronics')
        self.brand.categories.set([self.category])
        c_footwear = Category.objects.create(name='Footwear', slug='footwear')

        url = reverse('admin-product-list')
        response = self.client.post(url, {
            'name': 'Nike Shoes',
            'slug': 'nike-shoes',
            'category': c_footwear.id,
            'brand': self.brand.id
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('brand', response.data)

    def test_inventory_pagination_and_search(self):
        self.client.force_authenticate(user=self.staff_user)
        # Create inventory item to test pagination and search
        p_search = Product.objects.create(name='Unique Search Phone', slug='unique-search-phone', category=self.category)
        v_search = ProductVariant.objects.create(product=p_search, sku='UNIQUE-SKU-99', price=Decimal('999.00'))
        attr_color = ProductAttribute.objects.create(name='Color')
        attr_val = AttributeValue.objects.create(attribute=attr_color, value='Midnight Black')
        v_search.attribute_values.add(attr_val)
        Inventory.objects.create(product_variant=v_search, quantity=1)

        url = reverse('admin-inventory-list')
        # Test pagination count
        res_page1 = self.client.get(url)
        self.assertEqual(res_page1.status_code, status.HTTP_200_OK)
        self.assertIn('count', res_page1.data)
        self.assertIn('results', res_page1.data)

        # Test search by product name
        res_search_prod = self.client.get(url, {'search': 'Unique Search Phone'})
        self.assertEqual(res_search_prod.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search_prod.data['count'], 1)
        self.assertEqual(res_search_prod.data['results'][0]['sku'], 'UNIQUE-SKU-99')

        # Test search by variant name
        res_search_var = self.client.get(url, {'search': 'Midnight Black'})
        self.assertEqual(res_search_var.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search_var.data['count'], 1)

        # Test search by SKU
        res_search_sku = self.client.get(url, {'search': 'UNIQUE-SKU-99'})
        self.assertEqual(res_search_sku.status_code, status.HTTP_200_OK)
        self.assertEqual(res_search_sku.data['count'], 1)

    def test_inventory_stock_filters(self):
        self.client.force_authenticate(user=self.staff_user)
        p = Product.objects.create(name='Filter Test Product', slug='filter-test-prod', category=self.category)
        
        # Out of stock variant (qty = 0)
        v_out = ProductVariant.objects.create(product=p, sku='OOS-01', price=Decimal('10.00'))
        Inventory.objects.create(product_variant=v_out, quantity=0, reorder_level=5)

        # Low stock variant (qty = 3 <= reorder_level 5)
        v_low = ProductVariant.objects.create(product=p, sku='LOW-02', price=Decimal('10.00'))
        Inventory.objects.create(product_variant=v_low, quantity=3, reorder_level=5)

        # In stock variant (qty = 50 > reorder_level 5)
        v_in = ProductVariant.objects.create(product=p, sku='INS-03', price=Decimal('10.00'))
        Inventory.objects.create(product_variant=v_in, quantity=50, reorder_level=5)

        url = reverse('admin-inventory-list')

        # Out of stock filter
        res_oos = self.client.get(url, {'stock_filter': 'out_of_stock'})
        self.assertEqual(res_oos.status_code, status.HTTP_200_OK)
        skus_oos = [item['sku'] for item in res_oos.data['results']]
        self.assertIn('OOS-01', skus_oos)
        self.assertNotIn('INS-03', skus_oos)

        # Low stock filter
        res_low = self.client.get(url, {'stock_filter': 'low_stock'})
        self.assertEqual(res_low.status_code, status.HTTP_200_OK)
        skus_low = [item['sku'] for item in res_low.data['results']]
        self.assertIn('LOW-02', skus_low)

        # In stock filter
        res_in = self.client.get(url, {'stock_filter': 'in_stock'})
        self.assertEqual(res_in.status_code, status.HTTP_200_OK)
        skus_in = [item['sku'] for item in res_in.data['results']]
        self.assertIn('INS-03', skus_in)
        self.assertNotIn('OOS-01', skus_in)

    def test_inventory_transactions_pagination(self):
        self.client.force_authenticate(user=self.staff_user)
        url = reverse('admin-inventory-list-transactions')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_product_created_and_edited_with_no_brand(self):
        self.client.force_authenticate(user=self.staff_user)
        url_list = reverse('admin-product-list')
        
        # Create product with brand = None (No Brand)
        res_create = self.client.post(url_list, {
            'name': 'Generic USB Cable',
            'slug': 'generic-usb-cable',
            'category': self.category.id,
            'brand': None
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        prod_id = res_create.data['id']
        p_obj = Product.objects.get(id=prod_id)
        self.assertIsNone(p_obj.brand)

        # Edit existing product from self.brand to No Brand (brand = None)
        url_detail = reverse('admin-product-detail', kwargs={'pk': self.product.id})
        res_edit = self.client.patch(url_detail, {
            'brand': None
        }, format='json')
        self.assertEqual(res_edit.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertIsNone(self.product.brand)

    def test_safe_brand_deletion(self):
        self.client.force_authenticate(user=self.staff_user)
        # Attempt to delete self.brand which is currently linked to self.product
        url = reverse('admin-brand-detail', kwargs={'pk': self.brand.id})
        res_blocked = self.client.delete(url)
        self.assertEqual(res_blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot delete brand', res_blocked.data['detail'])
        self.assertTrue(Brand.objects.filter(id=self.brand.id).exists())

        # Unlink product from brand (set to No Brand)
        self.product.brand = None
        self.product.save()

        # Deleting unused brand must succeed
        res_success = self.client.delete(url)
        self.assertEqual(res_success.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Brand.objects.filter(id=self.brand.id).exists())

    def test_safe_category_deletion(self):
        self.client.force_authenticate(user=self.staff_user)
        # Attempt to delete self.category which is linked to self.product
        url = reverse('admin-category-detail', kwargs={'pk': self.category.id})
        res_blocked = self.client.delete(url)
        self.assertEqual(res_blocked.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot delete category', res_blocked.data['detail'])
        self.assertTrue(Category.objects.filter(id=self.category.id).exists())

        # Unused category deletion succeeds
        c_unused = Category.objects.create(name='Unused Cat', slug='unused-cat')
        url_unused = reverse('admin-category-detail', kwargs={'pk': c_unused.id})
        res_success = self.client.delete(url_unused)
        self.assertEqual(res_success.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=c_unused.id).exists())

    def test_brand_category_m2m_deletion_independence(self):
        self.client.force_authenticate(user=self.staff_user)
        c_test = Category.objects.create(name='Gadgets', slug='gadgets')
        b_test = Brand.objects.create(name='Anker', slug='anker')
        b_test.categories.add(c_test)

        # Removing M2M relation does not delete Brand or Category
        b_test.categories.remove(c_test)
        self.assertTrue(Brand.objects.filter(id=b_test.id).exists())
        self.assertTrue(Category.objects.filter(id=c_test.id).exists())

