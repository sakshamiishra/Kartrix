from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User, Address


class AccountsAuthTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('account-register')
        self.login_url = reverse('account-login')
        self.refresh_url = reverse('token-refresh')
        self.profile_url = reverse('account-profile')
        self.change_password_url = reverse('account-change-password')
        self.address_list_url = reverse('address-list')

        self.user_data = {
            'email': 'user1@example.com',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '9876543210',
        }
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='StrongPassword123!',
            first_name='John',
            last_name='Doe',
            phone='9876543210'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='AnotherPassword123!',
            first_name='Jane',
            last_name='Smith'
        )

    # 1. Registration & 2. Duplicate email rejection
    def test_user_registration_success(self):
        data = {
            'email': 'newuser@example.com',
            'password': 'NewPassword123!',
            'password_confirm': 'NewPassword123!',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'newuser@example.com')

    def test_registration_duplicate_email_rejection(self):
        data = {
            'email': 'user1@example.com',
            'password': 'SomePassword123!',
            'password_confirm': 'SomePassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    # 3. Login valid credentials, 4. Login invalid credentials, 5. JWT access token generation
    def test_login_success(self):
        data = {
            'email': 'user1@example.com',
            'password': 'StrongPassword123!'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'user1@example.com')

    def test_login_invalid_credentials(self):
        data = {
            'email': 'user1@example.com',
            'password': 'WrongPassword!'
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 6. JWT refresh
    def test_jwt_token_refresh(self):
        login_resp = self.client.post(self.login_url, {
            'email': 'user1@example.com',
            'password': 'StrongPassword123!'
        })
        refresh_token = login_resp.data['refresh']
        response = self.client.post(self.refresh_url, {'refresh': refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # 7. Authenticated profile retrieval & 14. Protected endpoint without auth
    def test_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated_retrieval(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user1@example.com')
        self.assertEqual(response.data['first_name'], 'John')

    # 8. Profile update
    def test_profile_update(self):
        self.client.force_authenticate(user=self.user1)
        data = {'first_name': 'Johnny', 'last_name': 'Doey', 'phone': '1112223333'}
        response = self.client.patch(self.profile_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Johnny')
        self.assertEqual(response.data['phone'], '1112223333')

    # 9. Password change correct old password & 10. Rejection with incorrect old password
    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'old_password': 'StrongPassword123!',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!'
        }
        response = self.client.post(self.change_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify new password works
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.check_password('BrandNewPassword123!'))

    def test_change_password_incorrect_old_password(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'old_password': 'WrongOldPassword!',
            'new_password': 'BrandNewPassword123!',
            'new_password_confirm': 'BrandNewPassword123!'
        }
        response = self.client.post(self.change_password_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('old_password', response.data)

    # 11. Address CRUD & 12. Default address behavior & 13. User-to-user address isolation
    def test_address_create_and_default_behavior(self):
        self.client.force_authenticate(user=self.user1)
        addr1_data = {
            'full_name': 'John Home',
            'phone': '9876543210',
            'address_line_1': '123 Main St',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'postal_code': '400001',
            'country': 'India',
        }
        resp1 = self.client.post(self.address_list_url, addr1_data)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        # First address should automatically be set as default
        self.assertTrue(resp1.data['is_default'])

        addr2_data = {
            'full_name': 'John Office',
            'phone': '9876543210',
            'address_line_1': '456 Business Rd',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'postal_code': '400002',
            'country': 'India',
            'is_default': True
        }
        resp2 = self.client.post(self.address_list_url, addr2_data)
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp2.data['is_default'])

        # Check that addr1 was reset to is_default=False
        addr1_obj = Address.objects.get(id=resp1.data['id'])
        self.assertFalse(addr1_obj.is_default)

    def test_address_set_default_action(self):
        self.client.force_authenticate(user=self.user1)
        addr1 = Address.objects.create(
            user=self.user1, full_name='A1', phone='1', address_line_1='L1', city='C', state='S', postal_code='1', is_default=True
        )
        addr2 = Address.objects.create(
            user=self.user1, full_name='A2', phone='2', address_line_1='L2', city='C', state='S', postal_code='2', is_default=False
        )

        url = reverse('address-set-default', kwargs={'pk': addr2.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        addr1.refresh_from_db()
        addr2.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

    def test_address_user_isolation(self):
        addr_user1 = Address.objects.create(
            user=self.user1, full_name='User1 Address', phone='1', address_line_1='L1', city='C', state='S', postal_code='1'
        )

        # Authenticate as user2
        self.client.force_authenticate(user=self.user2)

        # User2 should not see User1's address in list
        list_resp = self.client.get(self.address_list_url)
        self.assertEqual(len(list_resp.data), 0)

        # User2 cannot retrieve User1's address
        detail_url = reverse('address-detail', kwargs={'pk': addr_user1.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

        # User2 cannot update User1's address
        update_resp = self.client.patch(detail_url, {'full_name': 'Hacked'})
        self.assertEqual(update_resp.status_code, status.HTTP_404_NOT_FOUND)

        # User2 cannot delete User1's address
        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_404_NOT_FOUND)
