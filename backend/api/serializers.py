from rest_framework import serializers
from .models import User, Voucher, Campaign

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # We can now rely on the fields provided by the AbstractUser model.
        # The password will be handled automatically.
        fields = ('id', 'username', 'email', 'role', 'password', 'first_name', 'last_name', 'is_active')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        # Use the create_user method to handle password hashing.
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'customer'),  # Default to 'customer' if not provided
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

    def update(self, instance, validated_data):
        # Extract password if present
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Hash password if provided
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance

class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = '__all__'

class CampaignSerializer(serializers.ModelSerializer):
    voucher_name = serializers.ReadOnlyField(source='voucher.name')
    voucher_code = serializers.ReadOnlyField(source='voucher.code')
    voucher_discount = serializers.ReadOnlyField(source='voucher.discount_percentage')

    class Meta:
        model = Campaign
        fields = '__all__'
