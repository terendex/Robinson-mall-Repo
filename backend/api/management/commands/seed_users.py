from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Seeds the database with initial user data'

    def handle(self, *args, **options):
        users_data = [
            # Generic Users
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
            # Specific Users
            {
                "username": "sophie_baek", 
                "email": "baeksophie.manager@gmail.com", 
                "password": "Password123!",
                "role": "manager", 
                "first_name": "Sophie", 
                "last_name": "Baek"
            },
            {
                "username": "valerie_fletcher", 
                "email": "valerie.fletcher.staff@gmail.com", 
                "password": "Password123!",
                "role": "staff", 
                "first_name": "Valerie", 
                "last_name": "Fletcher"
            },
            {
                "username": "davy_jones", 
                "email": "davy.jones.staff@gmail.com", 
                "password": "Password123!",
                "role": "staff", 
                "first_name": "Davy", 
                "last_name": "Jones"
            },
            {
                "username": "joshua_hong", 
                "email": "hongjoshua123095@gmail.com", 
                "password": "Password123!",
                "role": "customer", 
                "first_name": "Joshua", 
                "last_name": "Hong", 
                "is_active": False
            },
            {
                "username": "john_doe", 
                "email": "johndoe@gmail.com", 
                "password": "Password123!",
                "role": "customer", 
                "first_name": "John", 
                "last_name": "Doe", 
                "is_active": True
            },
        ]

        self.stdout.write('Seeding users...')
        for u_data in users_data:
            try:
                if not User.objects.filter(username=u_data['username']).exists() and not User.objects.filter(email=u_data['email']).exists():
                    User.objects.create_user(
                        username=u_data['username'],
                        email=u_data['email'],
                        password=u_data['password'],
                        role=u_data['role'],
                        first_name=u_data.get('first_name', ''),
                        last_name=u_data.get('last_name', ''),
                        is_active=u_data.get('is_active', True)
                    )
                    self.stdout.write(self.style.SUCCESS(f"Successfully created user: {u_data['username']} ({u_data['role']})"))
                else:
                    self.stdout.write(self.style.WARNING(f"User already exists (username or email): {u_data['username']}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating user {u_data['username']}: {str(e)}"))
        self.stdout.write(self.style.SUCCESS('Seeding completed!'))
