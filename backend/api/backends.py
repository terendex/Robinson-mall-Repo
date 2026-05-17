
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # The "username" parameter is just the identifier (email in this case)
            user = UserModel.objects.get(email=username)
        except UserModel.DoesNotExist:
            return None

        # ISSUE-11: Check password AND that the account is active.
        # Disabled accounts (is_active=False) must not be allowed to log in.
        if user.check_password(password) and user.is_active:
            return user
        return None
