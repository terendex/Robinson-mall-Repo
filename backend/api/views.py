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
from .permissions import IsAdmin, IsManager, IsStaff, IsCustomer, IsOwnerOrStaff
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
    permission_classes = [IsAdmin]

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        return super().get_permissions()

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
    permission_classes = [IsStaff]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD for campaigns while dynamically overriding get_queryset 
    to automatically progress Scheduled -> Active -> Completed based on dates.
    """
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    permission_classes = [IsManager]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()

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
    permission_classes = [IsStaff]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()

class ClaimViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD operations for claims and supports URL param filtering by status or user_id.
    """
    queryset = Claim.objects.all()
    serializer_class = ClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Staff see everything
        if user.role in ['admin', 'manager', 'staff']:
            queryset = Claim.objects.all()
            status_param = self.request.query_params.get('status')
            user_id_param = self.request.query_params.get('user_id')
            
            if status_param:
                queryset = queryset.filter(status=status_param)
            if user_id_param:
                queryset = queryset.filter(user_id=user_id_param)
        else:
            # Customers only see their own claims
            queryset = Claim.objects.filter(user=user)
            
        return queryset.order_by('-created_at')

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        # Users see their own targeted notifications OR global notifications (user=None)
        return Notification.objects.filter(Q(user=user) | Q(user__isnull=True)).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        # ONLY mark notifications for the current user or global unread ones
        from django.db.models import Q
        Notification.objects.filter(
            Q(user=request.user) | Q(user__isnull=True),
            is_read=False
        ).update(is_read=True)
        return Response({'status': 'notifications marked as read for current user'})

class DashboardStatsView(views.APIView):
    """
    Generates aggregated metrics for the redesigned dashboard including:
    - Stat card summaries (active/scheduled campaigns, reach, claims today, vouchers)
    - Active & Upcoming Campaigns list
    - Claims Requiring Attention (Pending/Rejected)
    - Top Campaigns by Reach
    - Recent Activity timeline
    """
    permission_classes = [IsManager]

    def get(self, request):
        today = timezone.localtime().date()

        # ── Core counts ──────────────────────────────────────────────
        total_claims = Claim.objects.count()
        approved_claims = Claim.objects.filter(status='Approved').count()
        redemption_rate = round((approved_claims / total_claims * 100), 1) if total_claims > 0 else 0

        active_campaigns_count = Campaign.objects.filter(status='Active').count()
        scheduled_campaigns_count = Campaign.objects.filter(status='Scheduled').count()

        total_reach = Campaign.objects.aggregate(Sum('reach'))['reach__sum'] or 0
        claims_today = Claim.objects.filter(created_at__date=today).count()
        claims_pending = Claim.objects.filter(status='Pending').count()

        voucher_value_sum = Claim.objects.filter(status='Approved').aggregate(Sum('amount'))['amount__sum'] or 0

        # ── Active & Upcoming Campaigns list ─────────────────────────
        active_upcoming = Campaign.objects.filter(
            status__in=['Active', 'Scheduled']
        ).order_by('status', 'start_date')[:6]

        active_upcoming_list = [
            {
                'id': c.id,
                'name': c.name,
                'status': c.status,
                'start_date': str(c.start_date),
                'end_date': str(c.end_date),
            }
            for c in active_upcoming
        ]

        # ── Claims Requiring Attention ────────────────────────────────
        attention_claims = Claim.objects.filter(
            status__in=['Pending', 'Rejected']
        ).select_related('user', 'voucher').order_by('-created_at')[:5]

        attention_list = [
            {
                'id': c.id,
                'user_name': c.user.get_full_name() or c.user.username if c.user else 'Anonymous',
                'voucher_name': c.voucher.name if c.voucher else '—',
                'amount': float(c.amount or 0),
                'status': c.status,
            }
            for c in attention_claims
        ]

        # ── Top Campaigns by Reach ────────────────────────────────────
        top_campaigns = Campaign.objects.order_by('-reach')[:5]
        top_campaigns_list = [
            {
                'name': c.name,
                'reach': c.reach or 0,
            }
            for c in top_campaigns
        ]

        # ── Recent Activity (from Claims + Campaigns) ─────────────────
        recent_claims = Claim.objects.select_related('user', 'voucher').order_by('-created_at')[:6]
        recent_campaigns = Campaign.objects.order_by('-created_at')[:3]

        activity = []
        for c in recent_claims:
            user_display = c.user.get_full_name() or c.user.username if c.user else 'Anonymous'
            activity.append({
                'type': 'claim',
                'description': f'{user_display} claim {c.status.lower()}',
                'timestamp': c.created_at.isoformat(),
                'status': c.status,
            })
        for c in recent_campaigns:
            activity.append({
                'type': 'campaign',
                'description': f'{c.name} campaign {c.status.lower()}',
                'timestamp': c.created_at.isoformat(),
                'status': c.status,
            })
        activity.sort(key=lambda x: x['timestamp'], reverse=True)
        activity = activity[:8]

        # ── 6-month historical stats (kept for compatibility) ─────────
        monthly_stats = []
        for i in range(5, -1, -1):
            target_date = today - timedelta(days=30 * i)
            month_start = target_date.replace(day=1)
            if month_start.month == 12:
                next_month = month_start.replace(year=month_start.year + 1, month=1)
            else:
                next_month = month_start.replace(month=month_start.month + 1)

            month_claims = Claim.objects.filter(
                created_at__gte=month_start, created_at__lt=next_month
            ).count()
            month_redemptions = Claim.objects.filter(
                created_at__gte=month_start, created_at__lt=next_month, status='Approved'
            ).count()
            monthly_stats.append({
                'month': month_start.strftime('%b %Y'),
                'claims': month_claims,
                'redemptions': month_redemptions,
            })

        return Response({
            # Stat cards
            'total_claims': total_claims,
            'redemption_rate': redemption_rate,
            'active_campaigns': active_campaigns_count,
            'scheduled_campaigns': scheduled_campaigns_count,
            'total_reach': total_reach,
            'claims_today': claims_today,
            'claims_pending': claims_pending,
            'vouchers_redeemed': approved_claims,
            'vouchers_generated': total_claims,
            'voucher_value': float(voucher_value_sum),
            # Lists
            'active_upcoming_campaigns': active_upcoming_list,
            'claims_requiring_attention': attention_list,
            'top_campaigns_by_reach': top_campaigns_list,
            'recent_activity': activity,
            # Legacy chart data
            'monthly_stats': monthly_stats,
        })

