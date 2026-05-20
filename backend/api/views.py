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
        user = self.request.user
        qs = User.objects.all().order_by('-date_joined')
        if not user.is_authenticated:
            return qs.none()
        if user.role == 'staff':
            return qs.filter(role='customer')
        elif user.role == 'manager':
            # MF-03 FIX: Managers must not see peer-manager accounts (cross-role PII).
            return qs.filter(role__in=['staff', 'customer'])
        return qs

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        if self.action == 'me':
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve']:
            return [IsStaff()]
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
        # Prevent role escalation and direct password modification
        data.pop('role', None)
        data.pop('is_staff', None)
        data.pop('is_superuser', None)
        data.pop('password', None)
        data.pop('is_active', None)   # C-05 FIX: Prevent suspended-account self-reactivation

        # Handle password change separately
        old_password = data.pop('old_password', None)
        new_password = data.pop('new_password', None)

        if new_password:
            if not old_password:
                return Response({'detail': 'Current password is required to set a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            if not user.check_password(old_password):
                return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # ETHICS CHECK 1: Cannot be same as current password
            if old_password == new_password:
                return Response({'detail': 'New password cannot be the same as your current password.'}, status=status.HTTP_400_BAD_REQUEST)

            # ETHICS CHECK 2: Complexity rules (Caps, Special, etc.)
            import re
            if len(new_password) < 8:
                return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[A-Z]', new_password):
                return Response({'detail': 'Password must contain at least one uppercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[a-z]', new_password):
                return Response({'detail': 'Password must contain at least one lowercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[0-9]', new_password):
                return Response({'detail': 'Password must contain at least one number.'}, status=status.HTTP_400_BAD_REQUEST)
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', new_password):
                return Response({'detail': 'Password must contain at least one special character.'}, status=status.HTTP_400_BAD_REQUEST)

            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError
            try:
                validate_password(new_password, user=user)
            except ValidationError as e:
                return Response({'detail': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.save(update_fields=['password'])

        # Update other profile fields
        if data:
            serializer = self.get_serializer(user, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # CF-01 FIX: Only mint a new JWT pair when the password was actually changed.
        # Issuing tokens on every PATCH meant old stolen refresh tokens were never
        # invalidated (BLACKLIST_AFTER_ROTATION=False). Non-password updates return
        # user data only; the caller's current access token remains valid.
        payload = {
            'id': user.id,
            'role': user.role,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone_number': user.phone_number,
        }
        if new_password:
            refresh = RefreshToken.for_user(user)
            payload['access'] = str(refresh.access_token)
            payload['refresh'] = str(refresh)
        return Response(payload, status=status.HTTP_200_OK)
    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        """
        H-06 FIX: Prevent role escalation by non-admin callers.
        Only admins may change another user's role, is_staff, or is_superuser.
        """
        caller = self.request.user
        if caller.role != 'admin':
            serializer.validated_data.pop('role', None)
            serializer.validated_data.pop('is_staff', None)
            serializer.validated_data.pop('is_superuser', None)
        serializer.save()

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Strictly registers a new customer. Role escalation is prevented."""
        data = request.data.copy()
        
        # Security: Force role to customer and prevent superuser/staff creation
        data['role'] = 'customer'
        data.pop('is_staff', None)
        data.pop('is_superuser', None)
        data.pop('is_active', None)
        
        serializer = self.get_serializer(data=data)
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
                'email': user.email,
                'role': user.role,
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
            # M-10 FIX: Return the same 200 response as success to prevent user enumeration.
            # Distinguishing "not found" from "found" leaks which emails are registered.
            return Response(
                {'detail': 'If a user with that email exists, a password reset link has been sent.'},
                status=status.HTTP_200_OK
            )

        # Generate standard secure token and uid
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Link structure for the frontend
        reset_link = f"{settings.FRONTEND_URL}/password-reset/{uid}/{token}/"

        # ── Branded HTML email body ───────────────────────────────────
        subject = 'Password Reset Request – Robinson Mall'
        plain_text = (
            f"Hi {user.first_name or user.email},\n\n"
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
                        Hi {user.first_name or user.email},
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

        # ETHICS CHECK 1: Cannot be same as current password
        if user.check_password(password):
             return Response({'detail': 'New password cannot be the same as your current password.'}, status=status.HTTP_400_BAD_REQUEST)

        # ETHICS CHECK 2: Complexity rules (Caps, Special, etc.)
        import re
        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[A-Z]', password):
            return Response({'detail': 'Password must contain at least one uppercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[a-z]', password):
            return Response({'detail': 'Password must contain at least one lowercase letter.'}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[0-9]', password):
            return Response({'detail': 'Password must contain at least one number.'}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return Response({'detail': 'Password must contain at least one special character.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(password, user=user)
        except ValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        # CF-05 FIX: Force-update last_login so Django's HMAC token generator
        # changes its internal base, making this reset link invalid for any
        # future POST. Without this, accounts with last_login=None (never
        # logged in) could reuse the same reset link indefinitely.
        user.last_login = timezone.now()
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

        end_date = serializer.validated_data.get('end_date')

        if start_date and start_date < today:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'start_date': 'Start date cannot be in the past.'}
            )

        if start_date and end_date and end_date < start_date:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'end_date': 'End date cannot be before start date.'}
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

        end_date = serializer.validated_data.get('end_date', instance.end_date)

        if start_date and start_date < today:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'start_date': 'Start date cannot be in the past.'}
            )
            
        if start_date and end_date and end_date < start_date:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                {'end_date': 'End date cannot be before start date.'}
            )

        # Only re-derive status if not already Completed
        if instance.status != 'Completed':
            auto_status = 'Active' if start_date <= today else 'Scheduled'
            serializer.save(status=auto_status)
        else:
            serializer.save()

    def get_queryset(self):
        today = timezone.localtime().date()

        # HF-01 FIX: Gate the DB writes behind a per-hour cache key so they fire
        # at most once per hour per process rather than on every incoming request.
        # Without this, every GET /api/campaigns/ caused two UPDATE statements,
        # creating write contention under polling-heavy frontends.
        from django.core.cache import cache
        cache_key = f'campaign_status_updated_{today}'
        if not cache.get(cache_key):
            Campaign.objects.filter(status='Scheduled', start_date__lte=today).update(status='Active')
            Campaign.objects.filter(status='Active', end_date__lt=today).update(status='Completed')
            cache.set(cache_key, True, 3600)  # re-run at most once per hour

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

    def get_permissions(self):
        # CF-06 FIX: Explicitly declare every action's permission so there
        # is no silent fallback. 'create' intentionally stays IsAuthenticated
        # because both customers (self-service) and staff (on-behalf) must
        # be able to submit claims. perform_create enforces user scoping.
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsStaff()]
        return super().get_permissions()

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

    def perform_create(self, serializer):
        user = self.request.user
        voucher = serializer.validated_data.get('voucher')

        from django.db import transaction
        with transaction.atomic():
            if voucher:
                from rest_framework.exceptions import ValidationError
                from django.db.models import F, Sum

                # Lock the voucher row to serialise concurrent claim attempts
                voucher = Voucher.objects.select_for_update().get(pk=voucher.pk)

                # 1. One-per-user enforcement
                target_user = user if user.role == 'customer' else serializer.validated_data.get('user', user)
                if Claim.objects.filter(user=target_user, voucher=voucher).exists():
                    raise ValidationError("This user has already claimed this voucher.")

                # 2. Voucher usage limit enforcement
                if voucher.usage_count >= voucher.usage_limit:
                    raise ValidationError("This voucher has reached its maximum usage limit.")

                # 3. Campaign budget enforcement
                if voucher.campaign and voucher.campaign.budget > 0:
                    campaign = voucher.campaign
                    spent = Transaction.objects.filter(
                        voucher_code__in=campaign.vouchers.values_list('code', flat=True),
                        status='Approved'
                    ).aggregate(total=Sum('amount'))['total'] or 0

                    if spent >= campaign.budget:
                        raise ValidationError("This campaign's budget has been fully consumed.")

                # 4. Campaign expiration check
                if voucher.campaign:
                    today = timezone.localtime().date()
                    if voucher.campaign.end_date < today or voucher.campaign.status in ['Completed', 'Inactive']:
                        raise ValidationError("This voucher's campaign has already ended or is inactive.")

            # CF-02 FIX: Save the Claim row FIRST, THEN increment usage_count.
            # Previously the count was bumped before serializer.save(); if save()
            # raised a ValidationError or IntegrityError, the atomic rollback
            # would unwind the Claim but usage_count was already flushed via
            # F()-expression update, permanently leaking a usage slot.
            if user.role == 'customer':
                serializer.save(user=user, amount=0)
            else:
                serializer.save()

            if voucher:
                from django.db.models import F
                Voucher.objects.filter(pk=voucher.pk).update(
                    usage_count=F('usage_count') + 1
                )

    def perform_update(self, serializer):
        """
        C-01 FIX: When a claim is rejected via the generic PATCH endpoint
        (not the dedicated redeem action), the usage_count decrement was never
        fired. This override handles that so rejected claims always free their slot.

        CF-03 FIX: Re-acquire a row-level lock on the Claim before reading its
        current status. Previously, two concurrent PATCH requests could both read
        old_status='Pending', both pass the guard, and double-decrement usage_count.
        """
        from django.db import transaction as db_transaction
        from django.db.models import F
        instance = serializer.instance
        new_status = serializer.validated_data.get('status', instance.status)

        with db_transaction.atomic():
            # CF-03 FIX: Re-fetch under a write lock to get the authoritative status.
            locked = Claim.objects.select_for_update().get(pk=instance.pk)
            current_status = locked.status

            serializer.save()

            # Decrement only when transitioning TO Rejected from a non-Rejected state
            if new_status == 'Rejected' and current_status != 'Rejected' and locked.voucher:
                Voucher.objects.filter(pk=locked.voucher.pk).update(
                    usage_count=F('usage_count') - 1
                )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def lookup(self, request):
        """
        GET /api/claims/lookup/?q=JV-JOSHUA+A1B2C3D4   (new claim_ref format)
        GET /api/claims/lookup/?q=CLAIM-5              (legacy CLAIM-id format)
        GET /api/claims/lookup/?q=5                    (plain numeric ID)
        Staff/Manager use this after scanning a customer's QR code.
        Returns the claim with all related info for verification.
        """
        user = request.user
        if user.role not in ['admin', 'manager', 'staff']:
            return Response({'detail': 'Not authorised.'}, status=403)

        raw = request.query_params.get('q', '').strip()
        if not raw:
            return Response({'detail': 'Query parameter ?q is required.'}, status=400)

        claim = None

        # 1. Try matching the new claim_ref format (contains '+' or '-')
        if '+' in raw or (raw.upper() != raw.lstrip('CLAIM-').upper() and not raw.lstrip('CLAIM-').isdigit()):
            try:
                claim = Claim.objects.get(claim_ref__iexact=raw)
            except Claim.DoesNotExist:
                pass

        # 2. Try legacy CLAIM-{id} or plain numeric ID
        if claim is None:
            claim_id_str = raw.upper().replace('CLAIM-', '').strip()
            if claim_id_str.isdigit():
                try:
                    claim = Claim.objects.get(pk=int(claim_id_str))
                except Claim.DoesNotExist:
                    pass

        # 3. Last-resort: try claim_ref directly
        if claim is None:
            try:
                claim = Claim.objects.get(claim_ref__iexact=raw)
            except Claim.DoesNotExist:
                pass

        if claim is None:
            return Response({'detail': f'No claim found matching "{raw}".'}, status=404)

        serializer = self.get_serializer(claim)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def redeem(self, request, pk=None):
        """
        PATCH /api/claims/{id}/redeem/
        Marks a claim as Approved (Claimed) and generates an atomic Transaction. Staff/Manager only.
        Optionally accepts { "rejection_reason": "..." } to reject instead.
        """
        user = request.user
        if user.role not in ['admin', 'manager', 'staff']:
            return Response({'detail': 'Not authorised.'}, status=403)

        action_type = request.data.get('action', 'approve')  # 'approve' or 'reject'

        from django.db import transaction
        with transaction.atomic():
            # Lock the claim to prevent concurrent redemptions
            claim = Claim.objects.select_for_update().get(pk=pk)
            
            if claim.status != 'Pending':
                return Response({'detail': f'This claim has already been processed ({claim.status}).'}, status=400)

            if action_type == 'reject':
                claim.status = 'Rejected'
                claim.save(update_fields=['status', 'updated_at'])
                
                # Decrement voucher usage_count to free it up
                if claim.voucher:
                    from django.db.models import F
                    claim.voucher.usage_count = F('usage_count') - 1
                    claim.voucher.save(update_fields=['usage_count'])

                # Log rejection transaction
                Transaction.objects.create(
                    user=claim.user,
                    user_name=claim.user.get_full_name() if claim.user else '',
                    store=claim.store,
                    store_name=claim.store.name if claim.store else '',
                    voucher_name=claim.voucher.name if claim.voucher else '',
                    voucher_code=claim.voucher.code if claim.voucher else '',
                    receipt_no=claim.receipt_no or '',
                    amount=claim.amount or 0,
                    status='Rejected',
                    rejection_reason=request.data.get('rejection_reason', 'Claim rejected by staff.')
                )
            else:
                # C-02 FIX: Lock the voucher row to serialize concurrent approval attempts.
                # Without this, two staff members approving different claims for the same
                # voucher simultaneously could both pass budget/limit checks before either commits.
                if claim.voucher:
                    claim.voucher = Voucher.objects.select_for_update().get(pk=claim.voucher.pk)

                # H-07 FIX: Check SI uniqueness globally (not just per-store) to prevent
                # the same physical receipt from being approved across multiple stores.
                if claim.receipt_no and Transaction.objects.filter(
                    receipt_no=claim.receipt_no, status='Approved'
                ).exists():
                    return Response({'detail': 'This SI number has already been used in an approved transaction. Possible duplicate claim.'}, status=400)
                
                # Campaign budget enforcement at time of approval
                if claim.voucher and claim.voucher.campaign and claim.voucher.campaign.budget > 0:
                    campaign = Campaign.objects.select_for_update().get(pk=claim.voucher.campaign.pk)
                    spent = Transaction.objects.filter(
                        voucher_code__in=campaign.vouchers.values_list('code', flat=True),
                        status='Approved'
                    ).aggregate(total=Sum('amount'))['total'] or 0
                    
                    claim_amount = claim.amount or 0
                    if (spent + claim_amount) > campaign.budget:
                        return Response(
                            {'detail': f"Approving this claim ({claim_amount}) would exceed the campaign budget (Remaining: {max(0, campaign.budget - spent)})."},
                            status=400
                        )

                # Campaign expiration check at time of approval
                if claim.voucher and claim.voucher.campaign:
                    today = timezone.localtime().date()
                    if claim.voucher.campaign.end_date < today or claim.voucher.campaign.status in ['Completed', 'Inactive']:
                        return Response({'detail': "Cannot approve claim for an expired or inactive campaign voucher."}, status=400)

                claim.status = 'Approved'
                claim.save(update_fields=['status', 'updated_at'])
                # Generate atomic success transaction
                Transaction.objects.create(
                    user=claim.user,
                    user_name=claim.user.get_full_name() if claim.user else '',
                    store=claim.store,
                    store_name=claim.store.name if claim.store else '',
                    voucher_name=claim.voucher.name if claim.voucher else '',
                    voucher_code=claim.voucher.code if claim.voucher else '',
                    receipt_no=claim.receipt_no or '',
                    amount=claim.amount or 0,
                    status='Approved'
                )

        serializer = self.get_serializer(claim)
        return Response(serializer.data)
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaff()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save()

    def get_queryset(self):
        """
        Returns notifications specifically assigned to the requesting user.
        Isolation is guaranteed: clearing your alerts does not affect others.
        """
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    def get_object(self):
        """
        CF-07 FIX: DRF's default get_object() resolves PK from the class-level
        queryset (Notification.objects.all()), bypassing the user-filtered
        get_queryset(). Any staff member could DELETE/UPDATE another user's
        notification by guessing its integer PK.

        Enforce ownership: only the notification's owner (or an admin) may
        write to it. Read-only actions (retrieve) are left unrestricted within
        the already-filtered queryset.
        """
        obj = super().get_object()
        if self.action in ['destroy', 'update', 'partial_update']:
            if self.request.user.role != 'admin' and obj.user != self.request.user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    "You do not have permission to modify another user's notification."
                )
        return obj

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        ISSUE-01 FIX: Only mark the requesting user's OWN notifications as read.
        """
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'status': 'Your notifications have been marked as read.'})

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
        """
        All authenticated users (including customers) may submit transactions.
        - Status is always forced to 'Pending' on creation.
        - For customers, the user FK and user_name are auto-set from their
          own session so they cannot impersonate another user.
        - Staff/Admin can optionally set the user field for on-behalf submissions.
        """
        user = self.request.user
        if user.role == 'customer':
            full_name = f"{user.first_name} {user.last_name}".strip() or user.email
            serializer.save(
                status='Pending',
                user=user,
                user_name=full_name,
            )
        else:
            serializer.save(status='Pending')

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'manager', 'staff']:
            qs = Transaction.objects.all()
        else:
            from django.db.models import Q
            full_name  = f"{user.first_name} {user.last_name}".strip() or user.email
            phone      = user.phone_number or ""
            # Staff often enter "First L" (first name + last initial) so match that too
            matchers = (
                Q(user=user) |
                Q(user_name__iexact=full_name) |
                Q(user_name__iexact=user.email)
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
        Accepts: { "status": "Approved" | "Rejected", "rejection_reason": "..." }

        CF-04 FIX: Replaced select_for_update() guard with a conditional atomic
        UPDATE for the Approved path. SQLite WAL mode does not implement true
        row-level locking, so two concurrent Pending->Approved requests could
        both pass the old_status guard before either committed. Using
        filter(status='Pending').update() is inherently atomic — only one writer
        wins; the second gets rows_updated=0 and returns a 400.
        """
        txn = self.get_object()
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

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            if new_status == 'Approved':
                # Atomic conditional update — only succeeds if row is still Pending.
                rows_updated = Transaction.objects.filter(
                    pk=pk, status='Pending'
                ).update(status='Approved', updated_at=timezone.now())

                if rows_updated == 0:
                    txn.refresh_from_db()
                    return Response(
                        {'detail': f'Transaction could not be approved (current status: {txn.status}). It may have already been processed.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                txn.refresh_from_db()

            else:  # Rejected
                # Use select_for_update for Rejected path so we can read old_status
                # and conditionally sync the linked Claim (Approved->Rejected cascade).
                txn = Transaction.objects.select_for_update().get(pk=pk)
                old_status = txn.status

                # C-03 FIX: Enforce valid transitions.
                if old_status == 'Rejected':
                    return Response(
                        {'detail': 'Transaction is already Rejected.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if old_status == 'Approved':
                    # Cascade: sync Claim back to Rejected and free the voucher slot.
                    from django.db.models import F
                    if txn.receipt_no:
                        claim_qs = Claim.objects.filter(
                            receipt_no=txn.receipt_no, store=txn.store
                        )
                        if txn.user:
                            claim_qs = claim_qs.filter(user=txn.user)
                        claim = claim_qs.first()
                        if claim and claim.status == 'Approved':
                            claim.status = 'Rejected'
                            claim.save(update_fields=['status', 'updated_at'])
                            if claim.voucher:
                                Voucher.objects.filter(pk=claim.voucher.pk).update(
                                    usage_count=F('usage_count') - 1
                                )

                txn.status = 'Rejected'
                txn.rejection_reason = rejection_reason
                txn.save(update_fields=['status', 'rejection_reason', 'updated_at'])

        serializer = self.get_serializer(txn)
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

        # ISSUE-07 FIX: The Campaign.reach field is never updated; use live claim
        # count (unique customers who have at least one claim) as the real reach figure.
        total_reach = Claim.objects.values('user').distinct().count()
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
                'user_name': c.user.get_full_name() or c.user.email if c.user else 'Anonymous',
                'voucher_name': c.voucher.name if c.voucher else '—',
                'amount': float(c.amount or 0),
                'status': c.status,
            }
            for c in attention_claims
        ]

        # ── Top Campaigns by Reach ────────────────────────────────────
        # HF-04 FIX: Campaign.reach is a stale DB field that was never auto-updated.
        # Annotate with a live distinct-claim count for accurate rankings.
        from django.db.models import Count as DbCount
        top_campaigns = Campaign.objects.annotate(
            live_reach=DbCount('vouchers__claims', distinct=True)
        ).order_by('-live_reach')[:5]
        top_campaigns_list = [
            {
                'name': c.name,
                'reach': c.live_reach or 0,
            }
            for c in top_campaigns
        ]

        # ── Recent Activity (from Claims + Campaigns) ─────────────────
        recent_claims = Claim.objects.select_related('user', 'voucher').order_by('-created_at')[:6]
        recent_campaigns = Campaign.objects.order_by('-created_at')[:3]

        activity = []
        for c in recent_claims:
            user_display = c.user.get_full_name() or c.user.email if c.user else 'Anonymous'
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

