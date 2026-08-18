from django.db import models
from django.conf import settings
from products.models import Product


class UserActivity(models.Model):
    class EventType(models.TextChoices):
        PRODUCT_VIEW = 'PRODUCT_VIEW', 'Product View'
        PRODUCT_SEARCH = 'PRODUCT_SEARCH', 'Product Search'
        ADD_TO_CART = 'ADD_TO_CART', 'Add to Cart'
        REMOVE_FROM_CART = 'REMOVE_FROM_CART', 'Remove from Cart'
        ADD_TO_WISHLIST = 'ADD_TO_WISHLIST', 'Add to Wishlist'
        REMOVE_FROM_WISHLIST = 'REMOVE_FROM_WISHLIST', 'Remove from Wishlist'
        CHECKOUT_STARTED = 'CHECKOUT_STARTED', 'Checkout Started'
        PURCHASE = 'PURCHASE', 'Purchase'
        PRODUCT_REVIEWED = 'PRODUCT_REVIEWED', 'Product Reviewed'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='activities', db_index=True)
    event_type = models.CharField(max_length=30, choices=EventType.choices, db_index=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    search_query = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name_plural = 'User activities'

    def __str__(self):
        user_str = self.user.email if self.user else (self.session_id or 'Anonymous')
        return f"{self.event_type} by {user_str}"
