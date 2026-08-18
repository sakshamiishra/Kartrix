from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    UserProfileView,
    ChangePasswordView,
    AddressViewSet,
)

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='account-register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='account-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', UserProfileView.as_view(), name='account-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='account-change-password'),
    path('', include(router.urls)),
]
