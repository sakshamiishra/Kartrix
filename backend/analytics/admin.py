from django.contrib import admin
from .models import UserActivity

@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'user', 'session_id', 'product', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('user__email', 'session_id', 'search_query')
