from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User, Store, Campaign, Voucher, Claim, Transaction, Notification

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('email',)

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """Admin configuration for custom User profiles."""
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'role', 'phone_number', 'birthday')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'first_name', 'last_name', 'role', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    """Admin configuration for Participating Stores."""
    list_display = ('name', 'location', 'created_at')
    search_fields = ('name', 'location')

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    """Admin configuration for Campaigns."""
    list_display = ('name', 'status', 'budget', 'spending_target', 'start_date', 'end_date')
    list_filter = ('status', 'start_date', 'end_date')
    search_fields = ('name',)

@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    """Admin configuration for Vouchers."""
    list_display = ('name', 'code', 'voucher_type', 'discount_percentage', 'usage_limit', 'usage_count', 'is_active')
    list_filter = ('voucher_type', 'is_active', 'campaign')
    search_fields = ('name', 'code')

@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    """Admin configuration for Customer Claims."""
    list_display = ('claim_ref', 'user', 'voucher', 'store', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('claim_ref', 'receipt_no', 'user__email')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Admin configuration for Transaction Audit logs."""
    list_display = ('transaction_id', 'user_name', 'voucher_name', 'store_name', 'receipt_no', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('transaction_id', 'receipt_no', 'user_name', 'voucher_code')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin configuration for Notifications."""
    list_display = ('title', 'user', 'target_role', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'message')
