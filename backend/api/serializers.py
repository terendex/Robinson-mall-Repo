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
    class Meta:
        model = Store
        fields = '__all__'

class VoucherSerializer(serializers.ModelSerializer):
    discount_percentage = serializers.IntegerField(min_value=0, max_value=100)
    usage_limit = serializers.IntegerField(min_value=1)

    class Meta:
        model = Voucher
        fields = '__all__'

class CampaignSerializer(serializers.ModelSerializer):
    """Serializer exposing deeply nested voucher fields for frontend convenience."""
    voucher_name = serializers.ReadOnlyField(source='voucher.name')
    voucher_code = serializers.ReadOnlyField(source='voucher.code')
    voucher_discount = serializers.ReadOnlyField(source='voucher.discount_percentage')

    budget = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    class Meta:
        model = Campaign
        fields = '__all__'

class ClaimSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.get_full_name')
    user_phone = serializers.ReadOnlyField(source='user.phone_number')
    voucher_name = serializers.ReadOnlyField(source='voucher.name')
    voucher_code = serializers.ReadOnlyField(source='voucher.code')
    store_name = serializers.ReadOnlyField(source='store.name')

    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)

    class Meta:
        model = Claim
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Transaction audit-log model.
    Exposes a computed `transaction_id_short` (first 12 chars) for the
    table view and the full `transaction_id` UUID for detail views.
    """
    transaction_id_short = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ('transaction_id', 'created_at', 'updated_at')

    def get_transaction_id_short(self, obj):
        """Returns e.g. 'TXN-A1B2C3D4' — the full generated ID is already short."""
        return obj.transaction_id
