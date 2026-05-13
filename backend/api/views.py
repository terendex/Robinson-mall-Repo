import secrets
import smtplib
import os
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail, EmailMultiAlternatives
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
from .models import User, Voucher, Campaign, Store, Claim, Notification, Transaction
from .serializers import UserSerializer, VoucherSerializer, CampaignSerializer, StoreSerializer, ClaimSerializer, NotificationSerializer, TransactionSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed, created or managed.
    Includes custom actions for public registration and login.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        if self.action == 'me':
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Allows any authenticated user to view or update their own profile."""
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        # PATCH — partial update
        data = request.data.copy()
        # Prevent role escalation
        data.pop('role', None)
        data.pop('is_staff', None)
        data.pop('is_superuser', None)

        # Handle password change separately
        old_password = data.pop('old_password', None)
        new_password = data.pop('new_password', None)

        if new_password:
            if not old_password:
                return Response({'detail': 'Current password is required to set a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(old_password):
                return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save(update_fields=['password'])

        # Update other profile fields
        if data:
            serializer = self.get_serializer(user, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Return fresh user data
        refresh = RefreshToken.for_user(user)
        return Response({
            'id': user.id,
            'role': user.role,
            'email': user.email,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)
    def perform_create(self, serializer):
        role = self.request.data.get('role')
        if role == 'admin':
            # Remove all other admins before creating the new one
            User.objects.filter(role='admin').delete()
        
        serializer.save()

    def perform_update(self, serializer):
        role = self.request.data.get('role')
        if role == 'admin':
            # If promoting to admin, remove all other admins
            # (excluding the one being updated)
            User.objects.filter(role='admin').exclude(pk=serializer.instance.pk).delete()
        
        serializer.save()

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
    throttle_scope = 'password_reset'

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'detail': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'No account associated with this email address was found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate standard secure token and uid
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Link structure for the frontend
        reset_link = f"{settings.FRONTEND_URL}/password-reset/{uid}/{token}/"

        # ── Branded HTML email body ───────────────────────────────────
        subject = 'Password Reset Request – Robinson Mall'
        plain_text = (
            f"Hi {user.first_name or user.username},\n\n"
            f"We received a request to reset the password for your Robinson Mall account.\n\n"
            f"Click the link below to set a new password (valid for 5 minutes):\n{reset_link}\n\n"
            f"If you didn't request this, you can safely ignore this email — your password won't change.\n\n"
            f"— The Robinson Mall Team"
        )
        html_body = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

                  <!-- Header -->
                  <tr>
                    <td style="background:#C40000;padding:28px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                        Robinson Mall
                      </h1>
                      <p style="margin:4px 0 0;color:rgba(255,255,255,0.80);font-size:13px;">
                        Loyalty &amp; Rewards Portal
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 32px;">
                      <p style="margin:0 0 6px;font-size:15px;color:#1a1a1a;font-weight:600;">
                        Hi {user.first_name or user.username},
                      </p>
                      <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">
                        We received a request to reset the password for your Robinson Mall account.
                        Click the button below to choose a new password.
                        This link is valid for <strong>5 minutes</strong>.
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding:8px 0 28px;">
                            <a href="{reset_link}"
                               style="display:inline-block;padding:14px 36px;background:#C40000;color:#ffffff;
                                      text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;
                                      letter-spacing:0.3px;">
                              Reset My Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="margin:0 0 24px;word-break:break-all;">
                        <a href="{reset_link}" style="font-size:12.5px;color:#C40000;">{reset_link}</a>
                      </p>

                      <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">
                        If you didn't request a password reset, you can safely ignore this email —
                        your password will remain unchanged.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 40px;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#bbb;">
                        &copy; 2025 Robinson Mall. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[email],
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
        except smtplib.SMTPAuthenticationError:
            return Response({
                'detail': 'Email service is currently unavailable. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            return Response({
                'detail': 'An unexpected error occurred while sending the email.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'If a user with that email exists, a password reset link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetView(views.APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'password_reset'

    def get(self, request, uidb64, token):
        """Validates the token without resetting the password (for UI feedback)."""
        try:
            from django.utils.http import urlsafe_base64_decode
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
            if not default_token_generator.check_token(user, token):
                return Response({'detail': 'This password reset link has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'Token is valid.'}, status=status.HTTP_200_OK)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid or expired token link.'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, uidb64, token):
        password = request.data.get('password')
        if not password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.utils.http import urlsafe_base64_decode
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid or expired token link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
             return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()

        return Response({'detail': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


class VoucherViewSet(viewsets.ModelViewSet):
    queryset = Voucher.objects.all().order_by('-created_at')
    serializer_class = VoucherSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return Voucher.objects.all().order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()


class CampaignViewSet(viewsets.ModelViewSet):
    """
    Provides CRUD for campaigns while dynamically overriding get_queryset 
    to automatically progress Scheduled -> Active -> Completed based on dates.

    New campaigns are always created with status='Active' regardless of what
    the client sends.
    """
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    permission_classes = [IsManager]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """
        Validate start_date and auto-assign status:
          - Past date → rejected (400)
          - Today      → Active
          - Future     → Scheduled
        """
        from datetime import date
        start_date = serializer.validated_data.get('start_date')
        today = timezone.localtime().date()

        if start_date and start_date < today:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'start_date': 'Start date cannot be in the past.'}
            )

        auto_status = 'Active' if (not start_date or start_date <= today) else 'Scheduled'
        serializer.save(status=auto_status)

    def perform_update(self, serializer):
        """
        On edit, also re-derive status from the updated start_date
        (unless the campaign is already Completed).
        """
        from datetime import date
        instance = self.get_object()
        start_date = serializer.validated_data.get('start_date', instance.start_date)
        today = timezone.localtime().date()

        if start_date and start_date < today:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'start_date': 'Start date cannot be in the past.'}
            )

        # Only re-derive status if not already Completed
        if instance.status != 'Completed':
            auto_status = 'Active' if start_date <= today else 'Scheduled'
            serializer.save(status=auto_status)
        else:
            serializer.save()

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
    queryset = Store.objects.all().order_by('-created_at')
    serializer_class = StoreSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        return Store.objects.all().order_by('-created_at')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def vouchers(self, request, pk=None):
        """List all vouchers assigned to this store."""
        store = self.get_object()
        from .serializers import VoucherSerializer
        qs = store.vouchers.all()
        serializer = VoucherSerializer(qs, many=True)
        return Response(serializer.data)

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def lookup(self, request):
        """
        GET /api/claims/lookup/?q=CLAIM-5  (or just ?q=5)
        Staff/Manager use this after scanning a customer's QR code.
        Returns the claim with all related info for verification.
        """
        user = request.user
        if user.role not in ['admin', 'manager', 'staff']:
            return Response({'detail': 'Not authorised.'}, status=403)

        raw = request.query_params.get('q', '').strip()
        # Accept "CLAIM-5", "claim-5", or just "5"
        claim_id_str = raw.upper().replace('CLAIM-', '').strip()
        if not claim_id_str.isdigit():
            return Response({'detail': 'Invalid claim reference. Expected CLAIM-<id> or a numeric ID.'}, status=400)

        try:
            claim = Claim.objects.get(pk=int(claim_id_str))
        except Claim.DoesNotExist:
            return Response({'detail': f'No claim found with ID {claim_id_str}.'}, status=404)

        serializer = self.get_serializer(claim)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def redeem(self, request, pk=None):
        """
        PATCH /api/claims/{id}/redeem/
        Marks a claim as Approved (Claimed). Staff/Manager only.
        Optionally accepts { "rejection_reason": "..." } to reject instead.
        """
        user = request.user
        if user.role not in ['admin', 'manager', 'staff']:
            return Response({'detail': 'Not authorised.'}, status=403)

        claim = self.get_object()

        action_type = request.data.get('action', 'approve')  # 'approve' or 'reject'
        if action_type == 'reject':
            claim.status = 'Rejected'
        else:
            if claim.status == 'Approved':
                return Response({'detail': 'This voucher has already been claimed.'}, status=400)
            claim.status = 'Approved'

        claim.save(update_fields=['status', 'updated_at'])
        serializer = self.get_serializer(claim)
        return Response(serializer.data)



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

class TransactionViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoint for Transaction audit records.
    - Staff/Manager/Admin: full read + write access.
    - Customers: no access (403).

    Creation rules:
      - status is always forced to 'Pending' on creation
      - Updates may only set status to 'Redeemed' or 'Rejected'
      - 'Rejected' requires a non-empty rejection_reason

    Supports optional query-param filters:
      ?status=Redeemed  →  filter by status
      ?search=keyword   →  filter by user_name, store_name, receipt_no or transaction_id
    """
    queryset = Transaction.objects.all().order_by('-created_at')
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsStaff()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Force status to Pending and link to current user if customer."""
        user = self.request.user
        if user.role == 'customer':
            serializer.save(status='Pending', user=user)
        else:
            serializer.save(status='Pending')

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager', 'staff']:
            qs = Transaction.objects.all()
        else:
            from django.db.models import Q
            full_name  = f"{user.first_name} {user.last_name}".strip() or user.username

            # Staff often enter "First L" (first name + last initial) so match that too
            matchers = (
                Q(user=user) |
                Q(user_name__iexact=full_name) |
                Q(user_name__iexact=user.username)
            )
            if user.first_name and user.last_name:
                # "Joshua V"  →  first="Joshua", last="Villareal"
                initial = f"{user.first_name} {user.last_name[0]}"
                matchers |= Q(user_name__iexact=initial)
                matchers |= Q(user_name__iexact=f"{initial}.")
            elif user.first_name:
                matchers |= Q(user_name__iexact=user.first_name)

            qs = Transaction.objects.filter(matchers).distinct()

        qs = qs.order_by('-created_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        search_param = self.request.query_params.get('search')
        if search_param:
            from django.db.models import Q
            qs = qs.filter(
                Q(user_name__icontains=search_param) |
                Q(store_name__icontains=search_param) |
                Q(receipt_no__icontains=search_param) |
                Q(transaction_id__icontains=search_param)
            )

        return qs

    @action(detail=True, methods=['patch'], permission_classes=[IsStaff])
    def update_status(self, request, pk=None):
        """
        Dedicated status-update endpoint.
        Accepts: { "status": "Redeemed" | "Rejected", "rejection_reason": "..." }
        Validates transition rules and rejection reason requirement.
        """
        transaction = self.get_object()
        new_status = request.data.get('status')
        rejection_reason = request.data.get('rejection_reason', '').strip()

        if new_status not in ('Approved', 'Rejected'):
            return Response(
                {'detail': 'Status must be Approved or Rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status == 'Rejected' and not rejection_reason:
            return Response(
                {'rejection_reason': 'A rejection reason is required when rejecting a transaction.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        transaction.status = new_status
        if new_status == 'Rejected':
            transaction.rejection_reason = rejection_reason
        transaction.save(update_fields=['status', 'rejection_reason', 'updated_at'])

        serializer = self.get_serializer(transaction)
        return Response(serializer.data)


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

