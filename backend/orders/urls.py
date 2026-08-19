from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, CheckoutViewSet

router = DefaultRouter()
router.register(r'checkout', CheckoutViewSet, basename='checkout')
router.register(r'', OrderViewSet, basename='orders')

urlpatterns = [
    path('', include(router.urls)),
]
