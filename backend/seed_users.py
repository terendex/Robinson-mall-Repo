import os
import django
import sys

# Add the current directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'data.settings')
django.setup()

from api.models import User

def seed_data():
    print("Starting data seeding...")
    
    users = [
        {
            "username": "sophie_baek", 
            "email": "baeksophie.manager@gmail.com", 
            "role": "manager", 
            "first_name": "Sophie", 
            "last_name": "Baek"
        },
        {
            "username": "valerie_fletcher", 
            "email": "valerie.fletcher.staff@gmail.com", 
            "role": "staff", 
            "first_name": "Valerie", 
            "last_name": "Fletcher"
        },
        {
            "username": "davy_jones", 
            "email": "davy.jones.staff@gmail.com", 
            "role": "staff", 
            "first_name": "Davy", 
            "last_name": "Jones"
        },
        {
            "username": "joshua_hong", 
            "email": "hongjoshua123095@gmail.com", 
            "role": "customer", 
            "first_name": "Joshua", 
            "last_name": "Hong", 
            "is_active": False
        },
        {
            "username": "john_doe", 
            "email": "johndoe@gmail.com", 
            "role": "customer", 
            "first_name": "John", 
            "last_name": "Doe", 
            "is_active": True
        },
    ]

    for u_data in users:
        try:
            if not User.objects.filter(username=u_data['username']).exists():
                User.objects.create_user(
                    username=u_data['username'],
                    email=u_data['email'],
                    password='Password123!',
                    role=u_data['role'],
                    first_name=u_data['first_name'],
                    last_name=u_data['last_name'],
                    is_active=u_data.get('is_active', True)
                )
                print(f"✅ Created user: {u_data['username']} ({u_data['role']})")
            else:
                print(f"ℹ️ User {u_data['username']} already exists")
        except Exception as e:
            print(f"❌ Error creating user {u_data['username']}: {str(e)}")

    print("Seeding completed!")

if __name__ == '__main__':
    seed_data()
