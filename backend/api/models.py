from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('staff', 'Staff'),
        ('customer', 'Customer'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    password_reset_token = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.username

class Voucher(models.Model):
    VOUCHER_TYPES = (
        ('Fashion', 'Fashion'),
        ('Food & Beverage', 'Food & Beverage'),
        ('Entertainment', 'Entertainment'),
        ('Beauty', 'Beauty'),
        ('Electronics', 'Electronics'),
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    voucher_type = models.CharField(max_length=50, choices=VOUCHER_TYPES)
    discount_percentage = models.IntegerField()
    usage_limit = models.IntegerField()
    usage_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Campaign(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Inactive', 'Inactive'),
    )
    name = models.CharField(max_length=100)
    voucher = models.ForeignKey(Voucher, on_delete=models.CASCADE, related_name='campaigns')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Active')
    budget = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    reach = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
