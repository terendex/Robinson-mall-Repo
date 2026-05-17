from django.core.management.base import BaseCommand
from api.models import User

class Command(BaseCommand):
    help = 'Seeds the database with initial user data'

    def handle(self, *args, **options):
        users_data = [
            # Generic Users
            {
                "email": "admin@example.com",
                "password": "adminpassword",
                "role": "admin",
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
            },
            # Specific Users
            {
                "email": "baeksophie.manager@gmail.com", 
                "password": "Password123!",
                "role": "manager", 
                "first_name": "Sophie", 
                "last_name": "Baek"
            },
            {
                "email": "valerie.fletcher.staff@gmail.com", 
                "password": "Password123!",
                "role": "staff", 
                "first_name": "Valerie", 
                "last_name": "Fletcher"
            },
            {
                "email": "davy.jones.staff@gmail.com", 
                "password": "Password123!",
                "role": "staff", 
                "first_name": "Davy", 
                "last_name": "Jones"
            },
            {
                "email": "hongjoshua123095@gmail.com", 
                "password": "Password123!",
                "role": "customer", 
                "first_name": "Joshua", 
                "last_name": "Hong", 
                "is_active": False
            },
            {
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
                if not User.objects.filter(email=u_data['email']).exists():
                    User.objects.create_user(
                        
                        email=u_data['email'],
                        password=u_data['password'],
                        role=u_data['role'],
                        first_name=u_data.get('first_name', ''),
                        last_name=u_data.get('last_name', ''),
                        is_active=u_data.get('is_active', True)
                    )
                    self.stdout.write(self.style.SUCCESS(f"Successfully created user: {u_data['email']} ({u_data['role']})"))
                else:
                    self.stdout.write(self.style.WARNING(f"User already exists (username or email): {u_data['email']}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating user {u_data['email']}: {str(e)}"))
        self.stdout.write(self.style.SUCCESS('Seeding completed!'))
