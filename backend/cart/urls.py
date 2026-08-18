from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, CartItemViewSet

router = DefaultRouter()
router.register(r'items', CartItemViewSet, basename='cart-items')

urlpatterns = [
    path('', CartViewSet.as_view({'get': 'list'}), name='cart-detail'),
    path('clear/', CartViewSet.as_view({'post': 'clear'}), name='cart-clear'),
    path('', include(router.urls)),
]
