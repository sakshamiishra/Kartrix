from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    BrandViewSet,
    ProductViewSet,
    ProductImageViewSet,
    ProductAttributeViewSet,
    AttributeValueViewSet,
    ProductVariantViewSet,
    InventoryViewSet,
    InventoryTransactionViewSet,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-images', ProductImageViewSet, basename='product-image')
router.register(r'attributes', ProductAttributeViewSet, basename='product-attribute')
router.register(r'attribute-values', AttributeValueViewSet, basename='attribute-value')
router.register(r'variants', ProductVariantViewSet, basename='product-variant')
router.register(r'inventories', InventoryViewSet, basename='inventory')
router.register(r'inventory-transactions', InventoryTransactionViewSet, basename='inventory-transaction')

urlpatterns = [
    path('', include(router.urls)),
]
