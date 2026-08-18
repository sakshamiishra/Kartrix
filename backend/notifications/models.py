from django.db import models
from django.conf import settings


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ORDER_UPDATE = 'ORDER_UPDATE', 'Order Update'
        PAYMENT_UPDATE = 'PAYMENT_UPDATE', 'Payment Update'
        PRICE_DROP = 'PRICE_DROP', 'Price Drop'
        CART_REMINDER = 'CART_REMINDER', 'Cart Reminder'
        PROMOTION = 'PROMOTION', 'Promotion'
        SYSTEM = 'SYSTEM', 'System'
        CART_ABANDONED = 'CART_ABANDONED', 'Cart Abandoned'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications', db_index=True)
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} -> {self.user.email}"
