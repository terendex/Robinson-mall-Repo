import django
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "data.settings")
django.setup()

from rest_framework.test import APIClient
from api.models import User

# Grab any user to test credential generation
user = User.objects.first()
if not user:
    user = User.objects.create(email='test@example.com')
    user.set_password('password123')
    user.save()

client = APIClient()

print('Testing without token...')
resp1 = client.get('/api/users/')
print('Unauthenticated Response Status:', resp1.status_code)

print('\nTesting with login...')
resp2 = client.post('/api/users/login/', {'identifier': user.email, 'password': 'password123' if user.email == 'test@example.com' else 'RobinsonMall@2026'})
print('Login Status:', resp2.status_code)

if resp2.status_code == 200:
    token = resp2.data.get('access')
    print('Token received:', bool(token))
    
    print('\nTesting with token...')
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    resp3 = client.get('/api/users/')
    print('Authenticated Response Status:', resp3.status_code)
else:
    print('Error on login, testing direct token generation instead')
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(refresh.access_token))
    resp3 = client.get('/api/users/')
    print('Authenticated Response Status:', resp3.status_code)

