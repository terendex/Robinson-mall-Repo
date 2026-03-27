import os
import django
import sys

# Add current dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'data.settings')
django.setup()

from api.models import User

def check():
    count = User.objects.count()
    print(f"Total users: {count}")
    for user in User.objects.all():
        print(f"- {user.username} ({user.role}): {user.first_name} {user.last_name}")

if __name__ == '__main__':
    check()
