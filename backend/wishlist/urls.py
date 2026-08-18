from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WishlistItemViewSet

router = DefaultRouter()
router.register(r'items', WishlistItemViewSet, basename='wishlist-items')

urlpatterns = [
    path('toggle/', WishlistItemViewSet.as_view({'post': 'toggle'}), name='wishlist-toggle'),
    path('', include(router.urls)),
]
