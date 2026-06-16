from django.contrib import admin

from apps.chat.models import ChatMessage, Conversation


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "garden", "client", "last_message_at", "created_at")
    search_fields = ("garden__title", "client__email")
    autocomplete_fields = ("garden", "client")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "read_at", "created_at")
    list_filter = ("read_at",)
    search_fields = ("conversation__garden__title", "sender__email", "content")
    autocomplete_fields = ("conversation", "sender")
    readonly_fields = ("created_at", "updated_at")
