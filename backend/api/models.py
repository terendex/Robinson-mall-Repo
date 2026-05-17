from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    """
    Custom user model that extends AbstractUser.
    Adds a specific role property and password reset tracking.
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('staff', 'Staff'),
        ('customer', 'Customer'),
    )
    username = None
    email = models.EmailField(unique=True, blank=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=15, blank=True, null=True, default='')
    birthday = models.DateField(blank=True, null=True)
    password_reset_token = models.CharField(max_length=100, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = CustomUserManager()

    def __str__(self):
        return self.email

class Store(models.Model):
    """
    Represents a specific tenant or branch within the mall.
    """
    name = models.CharField(max_length=100, default='New Store')
    location = models.CharField(max_length=255, blank=True, null=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Campaign(models.Model):
    """
    Wraps multiple Vouchers with timing and budget logic. Keeps track of conversions.
    A Campaign must be created before Vouchers can be added to it (1:M Campaign→Voucher).
    """
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Inactive', 'Inactive'),
    )
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Active')
    budget = models.DecimalField(max_digits=15, decimal_places=2)
    spending_target = models.DecimalField(max_digits=15, decimal_places=2, default=0, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    reach = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Voucher(models.Model):
    """
    Defines a specific discount type or promotional item (e.g. 50% Fashion Voucher).
    A Voucher must belong to a Campaign (campaign is required).
    A Voucher may also be assigned to a specific Store (optional).
    One Campaign can have many Vouchers (1:M).
    One Store can have many Vouchers (1:M).
    """
    VOUCHER_TYPES = (
        ('Fashion', 'Fashion'),
        ('Food & Beverage', 'Food & Beverage'),
        ('Entertainment', 'Entertainment'),
        ('Beauty', 'Beauty'),
        ('Electronics', 'Electronics'),
    )

    DISCOUNT_CHOICES = (5, 10, 15, 20, 25, 30, 50)

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    voucher_type = models.CharField(max_length=50, choices=VOUCHER_TYPES)
    discount_percentage = models.IntegerField()
    usage_limit = models.IntegerField()
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    # Campaign FK — required (campaign must precede voucher)
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        related_name='vouchers',
        null=True,
        blank=True,
    )

    # Store FK — optional (store can have many vouchers)
    store = models.ForeignKey(
        Store,
        on_delete=models.SET_NULL,
        related_name='vouchers',
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Claim(models.Model):
    """
    Represents a customer's attempt to redeem a voucher at a specific store.
    """
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='claims', null=True, blank=True)
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE, related_name='claims', null=True, blank=True)
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, related_name='claims', null=True, blank=True)
    receipt_no = models.CharField(max_length=100, default='', blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Claim {self.receipt_no} - {self.status}"

class Transaction(models.Model):
    """
    Records a single voucher redemption transaction entered by staff.
    Acts as an audit log: stores de-normalised receipt data so it
    remains readable even if the related Voucher is later modified.

    Lifecycle: always created as Pending. Staff can then move to Redeemed or Rejected.
    Rejected transactions require a rejection_reason.
    """
    STATUS_CHOICES = (
        ('Pending',   'Pending'),
        ('Approved',  'Approved'),
        ('Rejected',  'Rejected'),
        ('Expired',   'Expired'),   # legacy / read-only
    )

    # Auto-generated unique transaction reference (TXN-XXXXXX)
    transaction_id = models.CharField(max_length=20, unique=True, blank=True)

    # Link to the customer who owns this transaction (nullable for legacy records)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='transactions',
        null=True,
        blank=True,
    )

    # De-normalised receipt fields (stored as plain text, not FKs)
    receipt_no   = models.CharField(max_length=100, blank=True, default='')
    user_name    = models.CharField(max_length=200, blank=True, default='')
    voucher_name = models.CharField(max_length=200, blank=True, default='')
    voucher_code = models.CharField(max_length=100, blank=True, default='')

    # Store — FK reference (preferred) + de-normalised fallback
    store        = models.ForeignKey(
        Store,
        on_delete=models.SET_NULL,
        related_name='transactions',
        null=True,
        blank=True,
    )
    store_name   = models.CharField(max_length=200, blank=True, default='')

    amount       = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expiry_date  = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

    # Rejection workflow
    rejection_reason = models.TextField(blank=True, default='')

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Auto-generate a short transaction_id on first save. Sync store_name from FK."""
        if not self.transaction_id:
            import uuid
            self.transaction_id = 'TXN-' + uuid.uuid4().hex[:8].upper()
        # Keep de-normalised store_name in sync with the FK
        if self.store_id and not self.store_name:
            self.store_name = self.store.name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_id} — {self.user_name}"


class Notification(models.Model):
    """
    System notifications for alerts (Global if user is null, or targeted).
    Can be targeted to a specific user OR a specific role.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    target_role = models.CharField(max_length=20, choices=User.ROLE_CHOICES, null=True, blank=True)
    NOTIFICATION_TYPES = (
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    )
    title = models.CharField(max_length=100)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

# ── Global Audit Notification Helper ──────────────────────────────────
def notify_management(title, message, n_type='info'):
    """Broadcasts a notification to all Admin, Manager, and Staff accounts."""
    recipients = User.objects.filter(role__in=['admin', 'manager', 'staff'])
    for user in recipients:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=n_type
        )

# ── Store Signals ───────────────────────────────────────────────────
@receiver(post_save, sender=Store)
def store_saved(sender, instance, created, **kwargs):
    action = "added" if created else "updated"
    notify_management(
        title=f"Store {action.capitalize()}",
        message=f"Store '{instance.name}' has been {action} in the system."
    )

@receiver(post_delete, sender=Store)
def store_deleted(sender, instance, **kwargs):
    notify_management(
        title="Store Deleted",
        message=f"Store '{instance.name}' has been removed from the system.",
        n_type='warning'
    )

# ── Voucher Signals ────────────────────────────────────────────────
@receiver(post_save, sender=Voucher)
def voucher_saved(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    notify_management(
        title=f"Voucher {action.capitalize()}",
        message=f"Voucher '{instance.name}' ({instance.code}) has been {action}."
    )

@receiver(post_delete, sender=Voucher)
def voucher_deleted(sender, instance, **kwargs):
    notify_management(
        title="Voucher Removed",
        message=f"Voucher '{instance.name}' has been permanently deleted.",
        n_type='warning'
    )

# ── Campaign Signals ───────────────────────────────────────────────
@receiver(post_save, sender=Campaign)
def campaign_saved(sender, instance, created, **kwargs):
    if created:
        # Custom message for new launches (existing logic preserved but standardized)
        notify_management(
            title="New Campaign Launched",
            message=f"Campaign '{instance.name}' is now {instance.status}.",
            n_type='success'
        )
    else:
        notify_management(
            title="Campaign Updated",
            message=f"Campaign details for '{instance.name}' have been modified."
        )

@receiver(post_delete, sender=Campaign)
def campaign_deleted(sender, instance, **kwargs):
    notify_management(
        title="Campaign Deleted",
        message=f"Campaign '{instance.name}' has been removed.",
        n_type='warning'
    )

# ── User Signals ───────────────────────────────────────────────────
@receiver(post_save, sender=User)
def user_saved(sender, instance, created, **kwargs):
    if created:
        if instance.role == 'customer':
            # Existing specific logic for customers
            notify_management(
                title="New Customer Joined",
                message=f"Customer {instance.get_full_name() or instance.email} has registered.",
                n_type='success'
            )
        else:
            notify_management(
                title="Management Account Created",
                message=f"A new {instance.role} account ({instance.email}) has been added.",
                n_type='info'
            )
    else:
        # BUG-LOGIC FIX: Skip "Account Updated" notification on every profile save
        # to prevent spamming the database with alerts.
        pass

@receiver(post_delete, sender=User)
def user_deleted(sender, instance, **kwargs):
    notify_management(
        title="Account Removed",
        message=f"The account for {instance.email} has been deleted.",
        n_type='warning'
    )

# ── Claim & Transaction Signals ────────────────────────────────────
@receiver(post_save, sender=Claim)
def claim_saved(sender, instance, created, **kwargs):
    # C-04 FIX: Guard against null voucher/user before accessing attributes.
    # Both FKs are nullable on the Claim model — touching .name or .email on
    # a None reference raises AttributeError and kills the entire save.
    voucher_name = instance.voucher.name if instance.voucher else 'Unknown Voucher'
    user_display = (
        instance.user.get_full_name() or instance.user.email
    ) if instance.user else 'Anonymous'

    if created:
        notify_management(
            title="New Claim Submitted",
            message=f"New claim for {voucher_name} by {user_display}.",
            n_type='warning'
        )
        # Only notify the specific customer if user is not null
        if instance.user:
            Notification.objects.create(
                user=instance.user,
                title="Claim Received",
                message=f"Your claim for {voucher_name} is now pending review.",
                notification_type='info'
            )
    else:
        # Only notify customer if status is processed and user is not null
        if instance.status in ['Approved', 'Rejected'] and instance.user:
            Notification.objects.create(
                user=instance.user,
                title=f"Claim {instance.status}",
                message=f"Your claim for {voucher_name} has been {instance.status.lower()}.",
                notification_type='success' if instance.status == 'Approved' else 'error'
            )

@receiver(post_save, sender=Transaction)
def transaction_saved(sender, instance, created, **kwargs):
    # Recalculate conversions (existing logic)
    if instance.voucher_code:
        try:
            voucher = Voucher.objects.get(code=instance.voucher_code)
            if voucher.campaign_id:
                campaign_codes = list(Voucher.objects.filter(campaign_id=voucher.campaign_id).values_list('code', flat=True))
                actual_conversions = Transaction.objects.filter(voucher_code__in=campaign_codes, status='Approved').count()
                Campaign.objects.filter(pk=voucher.campaign_id).update(conversions=actual_conversions)
        except Voucher.DoesNotExist: pass

    if not created:
        notify_management(
            title="Transaction Status Updated",
            message=f"Transaction {instance.transaction_id} was marked as {instance.status}."
        )
