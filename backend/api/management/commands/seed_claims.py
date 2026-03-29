
from django.core.management.base import BaseCommand
from faker import Faker
from api.models import Claim, User, Voucher

class Command(BaseCommand):
    help = 'Seeds the database with claims'

    def handle(self, *args, **options):
        fake = Faker()
        # Clear existing data
        Claim.objects.all().delete()

        # Get all users and vouchers
        users = User.objects.filter(role='customer')
        vouchers = Voucher.objects.all()

        if not users.exists():
            self.stdout.write(self.style.ERROR('No customer users found. Please seed users first.'))
            return

        if not vouchers.exists():
            self.stdout.write(self.style.ERROR('No vouchers found. Please seed vouchers first.'))
            return

        # Create claims
        for _ in range(10):
            customer = fake.random_element(elements=users)
            voucher = fake.random_element(elements=vouchers)
            store = fake.company()
            receipt_number = f'{fake.random_int(min=1000, max=9999)}-{fake.random_int(min=1000, max=9999)}'
            amount = fake.random_int(min=100, max=5000)
            status = fake.random_element(elements=('Pending', 'Approved', 'Rejected'))

            Claim.objects.create(
                customer=customer,
                voucher=voucher,
                store=store,
                receipt_number=receipt_number,
                amount=amount,
                status=status,
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded claims.'))
