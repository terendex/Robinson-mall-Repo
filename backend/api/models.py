from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

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
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=15, blank=True, null=True, default='')
    birthday = models.DateField(blank=True, null=True)
    password_reset_token = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.username

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
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    spending_target = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)
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
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='claims', null=True, blank=True)
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
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
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

@receiver(post_save, sender=Claim)
def create_claim_notification(sender, instance, created, **kwargs):
    """Automatically create notifications for users and admins when a claim is filed."""
    if created:
        # Notify Admins/Managers
        Notification.objects.create(
            title="New Claim submitted",
            message=f"Customer '{instance.user.first_name} {instance.user.last_name}' submitted a ₱{instance.amount} claim. Requires manual review.",
            notification_type='info'
        )
        # Notify the Customer who claimed it
        Notification.objects.create(
            user=instance.user,
            title="Claim Received",
            message=f"Your claim for {instance.voucher.name} has been received and is currently pending review.",
            notification_type='success'
        )

@receiver(post_save, sender=User)
def create_user_notification(sender, instance, created, **kwargs):
    """Alert admins when a new customer registers."""
    if created and instance.role == 'customer':
        Notification.objects.create(
            title="Customer Approval Pending",
            message=f"A new customer '{instance.first_name} {instance.last_name}' requires profile verification before activation.",
            notification_type='info'
        )

@receiver(post_save, sender=Campaign)
def create_campaign_notification(sender, instance, created, **kwargs):
    """Global notification whenever a new campaign is successfully launched."""
    if created:
        Notification.objects.create(
            title="New Campaign",
            message=f"Campaign '{instance.name}' has been created and is now {instance.status}.",
            notification_type='success'
        )

@receiver(post_save, sender=Transaction)
def update_campaign_conversions(sender, instance, created, **kwargs):
    """
    When a transaction is marked Approved, increment the conversions counter
    on the associated campaign (looked up via the transaction's voucher_code).
    Uses update_fields to avoid recursive signal triggers.
    """
    if not created and instance.status == 'Approved' and instance.voucher_code:
        try:
            voucher = Voucher.objects.get(code=instance.voucher_code)
            if voucher.campaign_id:
                Campaign.objects.filter(pk=voucher.campaign_id).update(
                    conversions=models.F('conversions') + 1
                )
        except Voucher.DoesNotExist:
            pass
