import secrets
import smtplib
import os
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate, login
from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')
        user = authenticate(request, username=identifier, password=password)
        if user is not None:
            login(request, user)
            return Response({'role': user.role, 'id': user.id}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(views.APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'If a user with that email exists, a password reset link has been sent.'}, status=status.HTTP_200_OK)

        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.save()

        reset_link = f"http://localhost:3000/password-reset/{token}"

        try:
            # --- BEGIN DEBUGGING --- 
            print("--- EMAIL DEBUGGING --- ")
            print(f"SENDGRID_API_KEY from os.environ: {os.environ.get('SENDGRID_API_KEY')}")
            print(f"DEFAULT_FROM_EMAIL from os.environ: {os.environ.get('DEFAULT_FROM_EMAIL')}")
            print(f"settings.DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
            # --- END DEBUGGING --- 

            send_mail(
                'Password Reset Request',
                f'Click the link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except smtplib.SMTPAuthenticationError as e:
            return Response({
                'detail': 'SMTP Authentication Error: Could not log in. Please check your email credentials in the environment variables.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'detail': 'An unexpected error occurred while sending the email.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'If a user with that email exists, a password reset link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetView(views.APIView):
    def post(self, request, token):
        password = request.data.get('password')
        if not password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_404_NOT_FOUND)

        user.set_password(password)
        user.password_reset_token = None
        user.save()

        return Response({'detail': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
