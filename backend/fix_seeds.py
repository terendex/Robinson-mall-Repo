import re
import sys

for f in ['backend/api/management/commands/seed_users.py', 'backend/api/management/commands/seed_all.py']:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove "username": "...", 
    content = re.sub(r'^\s*\"username\":\s*\".*?\",\s*\n', '', content, flags=re.MULTILINE)
    
    # Replace u_data['username'] with u_data['email']
    content = content.replace("u_data['username']", "u_data['email']")
    
    content = content.replace("username=u_data['email'],", "")
    
    # Replace User.objects.filter(username=u_data['email']).exists() and not User.objects.filter(email=u_data['email']).exists()
    content = content.replace("not User.objects.filter(username=u_data['email']).exists() and not User.objects.filter(email=u_data['email']).exists()", "not User.objects.filter(email=u_data['email']).exists()")
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print('Done!')
