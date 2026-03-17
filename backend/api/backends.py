
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # Try to fetch the user by username
            user = UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            try:
                # If the user doesn't exist, try to fetch them by email
                user = UserModel.objects.get(email=username)
            except UserModel.DoesNotExist:
                # If no user is found by username or email, return None
                return None

        # Check the password for the found user
        if user.check_password(password):
            return user
        return None
