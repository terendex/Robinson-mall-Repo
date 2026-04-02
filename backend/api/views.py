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
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from .models import User, Voucher, Campaign, Store, Claim, Notification
from .serializers import UserSerializer, VoucherSerializer, CampaignSerializer, StoreSerializer, ClaimSerializer, NotificationSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed, created or managed.
    Includes custom actions for public registration and login.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """Authenticates user credentials and issues a JWT token payload."""
        identifier = request.data.get('identifier')
        password = request.data.get('password')
        user = authenticate(request, username=identifier, password=password)
        if user is not None:
            login(request, user)
            refresh = RefreshToken.for_user(user)
            return Response({
                'id': user.id,
                'role': user.role,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(views.APIView):
    """
    Handles generation of a password reset token and dispatches the reset email.
    """
    permission_classes = [AllowAny]

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

        reset_link = f"http://localhost:5173/password-reset/{token}"

        try:
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
    permission_classes = [AllowAny]

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


class VoucherViewSet(viewsets.ModelViewSet):
    queryset = Voucher.objects.all()
    serializer_class = VoucherSerializer


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD for campaigns while dynamically overriding get_queryset 
    to automatically progress Scheduled -> Active -> Completed based on dates.
    """
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer

    def get_queryset(self):
        today = timezone.localtime().date()
        
        # Auto-update Scheduled to Active when start_date is hit
        scheduled_campaigns = Campaign.objects.filter(status='Scheduled', start_date__lte=today)
        for campaign in scheduled_campaigns:
            campaign.status = 'Active'
            campaign.save(update_fields=['status'])

        # Auto-update Active to Completed when end_date has passed
        active_campaigns = Campaign.objects.filter(status='Active', end_date__lt=today)
        for campaign in active_campaigns:
            campaign.status = 'Completed'
            campaign.save(update_fields=['status'])

        return super().get_queryset().order_by('-created_at')

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer

class ClaimViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD operations for claims and supports URL param filtering by status or user_id.
    """
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer

    def get_queryset(self):
        queryset = Claim.objects.all()
        status = self.request.query_params.get('status')
        user_id = self.request.query_params.get('user_id')
        
        if status:
            queryset = queryset.filter(status=status)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        return queryset.order_by('-created_at')

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            # Return global notifications (user=None) OR user's specific notifications
            from django.db.models import Q
            return Notification.objects.filter(Q(user_id=user_id) | Q(user__isnull=True)).order_by('-created_at')
        return Notification.objects.all().order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

class DashboardStatsView(views.APIView):
    """
    Generates aggregated metrics for the dashboard charts including:
    - Redemption Rates and Voucher values
    - 6-month Historical Data Arrays
    - Current Active Campaign Totals
    """
    def get(self, request):
        today = timezone.localtime().date()
        total_claims = Claim.objects.count()
        approved_claims = Claim.objects.filter(status='Approved').count()
        redemption_rate = round((approved_claims / total_claims * 100), 1) if total_claims > 0 else 0
        active_campaigns_count = Campaign.objects.filter(status='Active').count()
        voucher_value_sum = Claim.objects.filter(status='Approved').aggregate(Sum('amount'))['amount__sum'] or 0

        # Activity Overview: 6 months
        monthly_stats = []
        for i in range(5, -1, -1):
            # Calculate the first day of the month i months ago
            target_date = today - timedelta(days=30 * i)
            month_start = target_date.replace(day=1)
            # Find the last day of that month
            if month_start.month == 12:
                next_month = month_start.replace(year=month_start.year + 1, month=1)
            else:
                next_month = month_start.replace(month=month_start.month + 1)
            
            month_claims = Claim.objects.filter(created_at__gte=month_start, created_at__lt=next_month).count()
            month_redemptions = Claim.objects.filter(created_at__gte=month_start, created_at__lt=next_month, status='Approved').count()
            
            monthly_stats.append({
                'month': month_start.strftime('%b %Y'),
                'claims': month_claims,
                'redemptions': month_redemptions
            })

        # Campaign Distribution
        active_campaigns = Campaign.objects.filter(status='Active')
        campaign_distribution = []
        for campaign in active_campaigns:
            claims_count = Claim.objects.filter(voucher=campaign.voucher).count()
            if claims_count > 0:
                campaign_distribution.append({
                    'name': campaign.name,
                    'count': claims_count
                })

        return Response({
            'total_claims': total_claims,
            'redemption_rate': redemption_rate,
            'active_campaigns': active_campaigns_count,
            'voucher_value': float(voucher_value_sum),
            'monthly_stats': monthly_stats,
            'campaign_distribution': campaign_distribution
        })
