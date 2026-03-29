from django.core.management.base import BaseCommand
from api.models import Voucher, Campaign
from django.utils import timezone
import datetime

class Command(BaseCommand):
    help = 'Seeds the database with placeholder Vouchers and Campaigns'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Clear existing data
        Campaign.objects.all().delete()
        Voucher.objects.all().delete()

        # Vouchers
        v1 = Voucher.objects.create(
            name="20% Off Fashion",
            code="DISCOUNT20",
            voucher_type="Fashion",
            discount_percentage=20,
            usage_limit=1000,
            usage_count=456
        )
        v2 = Voucher.objects.create(
            name="Free Meal Combo",
            code="FREEMEAL",
            voucher_type="Food & Beverage",
            discount_percentage=100,
            usage_limit=300,
            usage_count=189
        )
        v3 = Voucher.objects.create(
            name="Buy 1 Get 1 Cinema",
            code="CINEMA100",
            voucher_type="Entertainment",
            discount_percentage=50,
            usage_limit=600,
            usage_count=445
        )
        v4 = Voucher.objects.create(
            name="Free Cofee",
            code="FREEMEAL2",
            voucher_type="Food & Beverage",
            discount_percentage=100,
            usage_limit=500,
            usage_count=234
        )
        v5 = Voucher.objects.create(
            name="15% Off Beauty Product",
            code="BEAUTY15",
            voucher_type="Beauty",
            discount_percentage=15,
            usage_limit=500,
            usage_count=312
        )
        v6 = Voucher.objects.create(
            name="50% Off Electronics",
            code="TECH50",
            voucher_type="Electronics",
            discount_percentage=50,
            usage_limit=200,
            usage_count=78
        )

        # Campaigns
        Campaign.objects.create(
            name="Summer Sale 2026",
            voucher=v1,
            status="Active",
            budget=50000,
            start_date=datetime.date(2026, 3, 1),
            end_date=datetime.date(2026, 4, 30),
            reach=8234,
            conversions=2458
        )
        Campaign.objects.create(
            name="Easter Special",
            voucher=v2,
            status="Scheduled",
            budget=30000,
            start_date=datetime.date(2026, 3, 15),
            end_date=datetime.date(2026, 3, 20),
            reach=5420,
            conversions=1234
        )
        Campaign.objects.create(
            name="Valentine's Day",
            voucher=v3,
            status="Completed",
            budget=70000,
            start_date=datetime.date(2026, 2, 10),
            end_date=datetime.date(2026, 2, 20),
            reach=10004,
            conversions=3221
        )
        Campaign.objects.create(
            name="Christmas Holiday Promo",
            voucher=v4,
            status="Completed",
            budget=100000,
            start_date=datetime.date(2025, 12, 18),
            end_date=datetime.date(2025, 12, 31),
            reach=12549,
            conversions=3221
        )
        Campaign.objects.create(
            name="End of Season Sale 2026",
            voucher=v5,
            status="Completed",
            budget=10000,
            start_date=datetime.date(2026, 1, 7),
            end_date=datetime.date(2026, 1, 18),
            reach=1227,
            conversions=678
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded Vouchers and Campaigns'))
