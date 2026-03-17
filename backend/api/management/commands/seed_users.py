from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from api.models import User

class Command(BaseCommand):
    help = 'Seeds the database with initial user data'

    def handle(self, *args, **options):
        users_data = [
            {
                "username": "admin@example.com",
                "email": "admin@example.com",
                "password": "adminpassword",
                "role": "admin",
            },
            {
                "username": "manager@example.com",
                "email": "manager@example.com",
                "password": "managerpassword",
                "role": "manager",
            },
            {
                "username": "staff@example.com",
                "email": "staff@example.com",
                "password": "staffpassword",
                "role": "staff",
            },
            {
                "username": "customer@example.com",
                "email": "customer@example.com",
                "password": "customerpassword",
                "role": "customer",
            },
        ]

        self.stdout.write('Seeding users...')
        for user_data in users_data:
            if not User.objects.filter(email=user_data['email']).exists():
                hashed_password = make_password(user_data['password'])
                User.objects.create(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=hashed_password,
                    role=user_data['role']
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully created user: {user_data['email']}"))
            else:
                self.stdout.write(self.style.WARNING(f"User already exists: {user_data['email']}"))
