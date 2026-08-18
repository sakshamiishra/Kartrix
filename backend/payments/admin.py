from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'payment_method', 'amount', 'currency', 'status', 'transaction_id', 'paid_at')
    list_filter = ('payment_method', 'status', 'created_at')
    search_fields = ('transaction_id', 'order__order_number', 'gateway_order_id', 'gateway_payment_id')
