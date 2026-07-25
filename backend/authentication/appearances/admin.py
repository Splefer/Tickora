from django.contrib import admin

from .models import AppearanceRequests, Notifications


@admin.register(AppearanceRequests)
class AppearanceRequestsAdmin(admin.ModelAdmin):
    list_display = ("request_id", "event", "performer", "requested_by", "status", "created_at")
    list_filter = ("status",)


@admin.register(Notifications)
class NotificationsAdmin(admin.ModelAdmin):
    list_display = ("notification_id", "user", "is_read", "created_at")
    list_filter = ("is_read",)
