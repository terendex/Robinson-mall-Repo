import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'data.settings')
django.setup()
from django.conf import settings

print(f"PASSWORD_RESET_TIMEOUT: {settings.PASSWORD_RESET_TIMEOUT}")
