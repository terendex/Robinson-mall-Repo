from django.core.management.base import BaseCommand
from faker import Faker
from api.models import User, Voucher, Campaign, Store, Claim
import datetime
import random

class Command(BaseCommand):
    help = 'Seeds the database with all the necessary data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        # Clear existing data
        Claim.objects.all().delete()
        Campaign.objects.all().delete()
        Voucher.objects.all().delete()
        Store.objects.all().delete()
        User.objects.all().delete()

        # Seed users
        users_data = [
            {
                "email": "admin",
                "password": "adminpassword",
                "role": "admin",
                "phone_number": "0917 123 4567"
            },
            {
                "email": "manager@example.com",
                "password": "managerpassword",
                "role": "manager",
            },
            {
                "email": "staff@example.com",
                "password": "staffpassword",
                "role": "staff",
            },
            {
                "email": "customer@example.com",
                "password": "customerpassword",
                "role": "customer",
                "phone_number": "0912 345 6789"
            },
            {
                "email": "maria@example.com",
                "password": "Password123!",
                "role": "customer",
                "first_name": "Maria",
                "last_name": "Santos",
                "phone_number": "+63 947-264-9274"
            },
            {
                "email": "juan@example.com",
                "password": "Password123!",
                "role": "customer",
                "first_name": "Juan",
                "last_name": "Dela Cruz",
                "phone_number": "+63 977-452-1694"
            },
            {
                "email": "ana@example.com",
                "password": "Password123!",
                "role": "customer",
                "first_name": "Ana",
                "last_name": "Garcia",
                "phone_number": "+63 905-753-2144"
            },
            {
                "email": "pedro@example.com",
                "password": "Password123!",
                "role": "customer",
                "first_name": "Pedro",
                "last_name": "Reyes",
                "phone_number": "+63 926-843-7282"
            },
            {
                "email": "sofia@example.com",
                "password": "Password123!",
                "role": "customer",
                "first_name": "Sofia",
                "last_name": "Cruz",
                "phone_number": "+63 916-560-4721"
            },
        ]

        created_users = {}
        for u_data in users_data:
            try:
                user = User.objects.create_user(
                    
                    email=u_data['email'],
                    password=u_data['password'],
                    role=u_data['role'],
                    first_name=u_data.get('first_name', ''),
                    last_name=u_data.get('last_name', ''),
                    phone_number=u_data.get('phone_number', ''),
                    is_active=u_data.get('is_active', True)
                )
                created_users[u_data['email']] = user
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating user {u_data['email']}: {str(e)}"))

        # Seed Stores
        stores_data = [
            "Robinsons Department Store",
            "Chapo's Grill & Sizzlers",
            "Dunkin' Donuts",
            "Robinsons Supermarket",
            "Octagon",
            "Uniqlo",
            "H&M",
            "Starbucks"
        ]
        created_stores = []
        for s_name in stores_data:
            store = Store.objects.create(name=s_name, location="Level 1")
            created_stores.append(store)

        # Seed Vouchers
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
            name="Free Coffee",
            code="FREECOFFEE",
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

        # Seed Campaigns
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
            name="Easter Special 2026",
            voucher=v2,
            status="Scheduled",
            budget=30000,
            start_date=datetime.date(2026, 3, 30),
            end_date=datetime.date(2026, 4, 15),
            reach=5420,
            conversions=1234
        )
        Campaign.objects.create(
            name="Mother's Day Promo",
            voucher=v5,
            status="Scheduled",
            budget=45000,
            start_date=datetime.date(2026, 5, 1),
            end_date=datetime.date(2026, 5, 15),
            reach=0,
            conversions=0
        )
        Campaign.objects.create(
            name="Holiday Cashback",
            voucher=v4,
            status="Active",
            budget=15000,
            start_date=datetime.date(2026, 3, 20),
            end_date=datetime.date(2026, 4, 15),
            reach=3200,
            conversions=890
        )
        Campaign.objects.create(
            name="Valentine's Day 2026",
            voucher=v3,
            status="Completed",
            budget=70000,
            start_date=datetime.date(2026, 2, 1),
            end_date=datetime.date(2026, 2, 28),
            reach=10004,
            conversions=3221
        )
        Campaign.objects.create(
            name="Flash Tech Sale",
            voucher=v6,
            status="Completed",
            budget=25000,
            start_date=datetime.date(2026, 1, 15),
            end_date=datetime.date(2026, 1, 25),
            reach=5500,
            conversions=1800
        )
        Campaign.objects.create(
            name="Coffee Lover's Week",
            voucher=v4,
            status="Active",
            budget=8000,
            start_date=datetime.date(2026, 3, 1),
            end_date=datetime.date(2026, 3, 31),
            reach=1200,
            conversions=450
        )
        Campaign.objects.create(
            name="Style Reboot 2026",
            voucher=v1,
            status="Active",
            budget=35000,
            start_date=datetime.date(2026, 3, 10),
            end_date=datetime.date(2026, 5, 10),
            reach=4500,
            conversions=1200
        )

        # Seed Specific Claims from the Image
        claims_data = [
            {
                "user": created_users["maria_santos"],
                "voucher": v1,
                "store": created_stores[0], # Robinsons Department Store
                "receipt_no": "RDS-2026-0115-1001",
                "amount": 1250.00,
                "status": "Approved"
            },
            {
                "user": created_users["juan_dela_cruz"],
                "voucher": v2,
                "store": created_stores[1], # Chapo's Grill & Sizzlers
                "receipt_no": "CGS-2026-0115-1002",
                "amount": 520.00,
                "status": "Pending"
            },
            {
                "user": created_users["ana_garcia"],
                "voucher": v4,
                "store": created_stores[2], # Dunkin' Donuts
                "receipt_no": "DD-2026-0115-1003",
                "amount": 150.00,
                "status": "Pending"
            },
            {
                "user": created_users["pedro_reyes"],
                "voucher": v2,
                "store": created_stores[3], # Robinsons Supermarket
                "receipt_no": "RS-2026-0203-1001",
                "amount": 870.00,
                "status": "Rejected"
            },
            {
                "user": created_users["sofia_cruz"],
                "voucher": v6,
                "store": created_stores[4], # Octagon
                "receipt_no": "OCT-2026-0203-1005",
                "amount": 5140.00,
                "status": "Approved"
            },
        ]

        for c_data in claims_data:
            Claim.objects.create(**c_data)

        # Add more random claims
        fake = Faker()
        customers = User.objects.filter(role='customer')
        vouchers = Voucher.objects.all()

        for _ in range(5):
            Claim.objects.create(
                user=random.choice(customers),
                voucher=random.choice(vouchers),
                store=random.choice(created_stores),
                receipt_no=f"RCPT-{random.randint(1000, 9999)}",
                amount=random.randint(100, 10000),
                status=random.choice(['Pending', 'Approved', 'Rejected'])
            )

        self.stdout.write(self.style.SUCCESS('Database seeding completed.'))
