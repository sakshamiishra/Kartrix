"""
URL configuration for easykart project (Kartrix 2.0 Backend).
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from rest_framework.routers import DefaultRouter
from .admin_views import (
    AdminDashboardStatsView,
    AdminProductViewSet,
    AdminCategoryViewSet,
    AdminBrandViewSet,
    AdminInventoryViewSet,
    AdminOrderViewSet,
    AdminPaymentViewSet,
    AdminReviewViewSet,
    AdminCouponViewSet,
    AdminUserViewSet,
)

admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'categories', AdminCategoryViewSet, basename='admin-category')
admin_router.register(r'brands', AdminBrandViewSet, basename='admin-brand')
admin_router.register(r'inventory', AdminInventoryViewSet, basename='admin-inventory')
admin_router.register(r'orders', AdminOrderViewSet, basename='admin-order')
admin_router.register(r'payments', AdminPaymentViewSet, basename='admin-payment')
admin_router.register(r'reviews', AdminReviewViewSet, basename='admin-review')
admin_router.register(r'coupons', AdminCouponViewSet, basename='admin-coupon')
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Accounts API
    path('api/accounts/', include('accounts.urls')),

    # Products API
    path('api/products/', include('products.urls')),

    # Cart API
    path('api/cart/', include('cart.urls')),

    # Wishlist API
    path('api/wishlist/', include('wishlist.urls')),

    # Orders API
    path('api/orders/', include('orders.urls')),

    # Payments API
    path('api/payments/', include('payments.urls')),

    # Reviews API
    path('api/reviews/', include('reviews.urls')),

    # Recommendations API
    path('api/recommendations/', include('recommendations.urls')),

    # Admin API
    path('api/admin/dashboard/', AdminDashboardStatsView.as_view(), name='admin-dashboard'),
    path('api/admin/', include(admin_router.urls)),

    # OpenAPI 3 Schema & Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
