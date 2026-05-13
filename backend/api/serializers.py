from rest_framework import serializers
from .models import User, Voucher, Campaign, Store, Claim, Notification, Transaction

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User ensuring secure password hashing on creation and update."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'password', 'first_name', 'last_name', 'phone_number', 'birthday', 'is_active')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'customer'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            birthday=validated_data.get('birthday', None)
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class StoreSerializer(serializers.ModelSerializer):
    # Include count of vouchers attached to this store
    voucher_count = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = ('id', 'name', 'location', 'created_at', 'voucher_count')

    def get_voucher_count(self, obj):
        return obj.vouchers.count()

class VoucherSerializer(serializers.ModelSerializer):
    discount_percentage = serializers.IntegerField(min_value=0, max_value=100)
    usage_limit = serializers.IntegerField(min_value=1)

    # Read-only derived fields from FK relationships
    campaign_name = serializers.ReadOnlyField(source='campaign.name')
    store_name    = serializers.ReadOnlyField(source='store.name')

    class Meta:
        model = Voucher
        fields = (
            'id', 'name', 'code', 'voucher_type', 'discount_percentage',
            'usage_limit', 'usage_count', 'is_active',
            'campaign', 'campaign_name',
            'store', 'store_name',
            'created_at', 'updated_at',
        )

class CampaignSerializer(serializers.ModelSerializer):
    """Serializer exposing nested voucher list and auto-computed reach/conversions."""
    # Both reach and conversions are fully auto-computed
    vouchers      = serializers.SerializerMethodField()
    voucher_count = serializers.SerializerMethodField()
    reach         = serializers.SerializerMethodField()  # count of Claims for campaign vouchers
    conversions   = serializers.SerializerMethodField()  # count of Approved transactions

    budget          = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    spending_target  = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, allow_null=True, required=False)

    voucher_type     = serializers.SerializerMethodField()
    voucher_discount = serializers.SerializerMethodField()
    voucher_id       = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = (
            'id', 'name', 'status', 'budget', 'spending_target',
            'start_date', 'end_date',
            'reach', 'conversions',
            'vouchers', 'voucher_count',
            'voucher_type', 'voucher_discount', 'voucher_id',
            'created_at', 'updated_at',
        )
        read_only_fields = ('reach', 'conversions', 'created_at', 'updated_at')

    def get_voucher_type(self, obj):
        first = obj.vouchers.first()
        return first.voucher_type if first else 'N/A'

    def get_voucher_discount(self, obj):
        first = obj.vouchers.first()
        return first.discount_percentage if first else 0

    def get_voucher_id(self, obj):
        first = obj.vouchers.first()
        return first.id if first else None

    def get_reach(self, obj):
        """Reach = total Claims made against any voucher in this campaign."""
        from .models import Claim
        return Claim.objects.filter(voucher__campaign=obj).count()

    def get_conversions(self, obj):
        """Conversions = Approved transactions linked to this campaign's vouchers."""
        from .models import Transaction
        voucher_codes = list(obj.vouchers.values_list('code', flat=True))
        if not voucher_codes:
            return 0
        return Transaction.objects.filter(
            voucher_code__in=voucher_codes,
            status='Approved'
        ).count()

    def get_vouchers(self, obj):
        return [
            {
                'id': v.id,
                'name': v.name,
                'code': v.code,
                'voucher_type': v.voucher_type,
                'discount_percentage': v.discount_percentage,
                'is_active': v.is_active,
                'store_id': v.store_id,
                'store_name': v.store.name if v.store else 'All Stores',
            }
            for v in obj.vouchers.all()
        ]

    def get_voucher_count(self, obj):
        return obj.vouchers.count()

class ClaimSerializer(serializers.ModelSerializer):
    user_name    = serializers.ReadOnlyField(source='user.get_full_name')
    user_phone   = serializers.ReadOnlyField(source='user.phone_number')
    voucher_name = serializers.ReadOnlyField(source='voucher.name')
    voucher_code = serializers.ReadOnlyField(source='voucher.code')
    store_name   = serializers.ReadOnlyField(source='store.name')

    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    class Meta:
        model = Claim
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Transaction audit-log model.

    New rules:
    - status defaults to 'Pending' on creation
    - Only 'Redeemed' or 'Rejected' are valid status updates
    - rejection_reason is required when status == 'Rejected'
    - store_name is surfaced from the Store FK (read-only computed)
    """
    transaction_id_short = serializers.SerializerMethodField()
    # Read store name from FK if available, else from de-normalised field
    store_display_name   = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = (
            'id', 'transaction_id', 'transaction_id_short',
            'user', 'receipt_no', 'user_name',
            'store', 'store_name', 'store_display_name',
            'voucher_name', 'voucher_code',
            'amount', 'expiry_date',
            'status', 'rejection_reason',
            'created_at', 'updated_at',
        )
        read_only_fields = ('transaction_id', 'created_at', 'updated_at')

    def get_transaction_id_short(self, obj):
        """Returns e.g. 'TXN-A1B2C3D4' — the full generated ID is already short."""
        return obj.transaction_id

    def get_store_display_name(self, obj):
        """FK store name takes priority; falls back to de-normalised store_name text."""
        if obj.store_id:
            return obj.store.name
        return obj.store_name

    def validate(self, data):
        """
        Enforce status transition rules:
          - New transactions can only be Pending (enforced in view)
          - Updates can only set status to Approved or Rejected
          - Rejected requires rejection_reason
        """
        instance = self.instance  # None on create
        new_status = data.get('status')

        if instance is not None and new_status:
            if new_status not in ('Approved', 'Rejected', 'Pending', 'Expired'):
                raise serializers.ValidationError(
                    {'status': 'Invalid status value.'}
                )
            if new_status == 'Rejected':
                reason = data.get('rejection_reason') or (instance.rejection_reason if instance else '')
                if not reason or not reason.strip():
                    raise serializers.ValidationError(
                        {'rejection_reason': 'A rejection reason is required when rejecting a transaction.'}
                    )

        # SI (receipt_no) uniqueness check on creation
        receipt_no = data.get('receipt_no')
        if not instance and receipt_no:
            if Transaction.objects.filter(receipt_no=receipt_no).exists():
                raise serializers.ValidationError({'receipt_no': 'A transaction with this SI number already exists.'})

        # Ensure SI and Transaction ID cannot be the same value
        # Note: transaction_id is auto-generated in model.save(), but if provided in data (unlikely per Meta)
        # or if we compare against generated pattern, we should check.
        # But most likely the user wants to prevent entering an SI that looks like a TXN ID or vice versa.
        txn_id = data.get('transaction_id') or (instance.transaction_id if instance else None)
        if receipt_no and txn_id and receipt_no == txn_id:
             raise serializers.ValidationError({'receipt_no': 'SI number and Transaction ID cannot be identical.'})

        return data
