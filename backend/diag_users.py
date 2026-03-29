import os
import django
import sys

# Add current dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'data.settings')
django.setup()

from api.models import User

def check():
    print("--- User Database Check ---")
    count = User.objects.count()
    print(f"Total users: {count}")
    for user in User.objects.all():
        active_status = "Active" if user.is_active else "Disabled"
        print(f"User: {user.username} | Role: {user.role} | Name: {user.first_name} {user.last_name} | Status: {active_status}")
    sys.stdout.flush()

if __name__ == '__main__':
    check()
