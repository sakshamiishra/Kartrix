from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, Address


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone')

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password fields do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'updated_at')
        read_only_fields = ('id', 'email', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'updated_at')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            'id',
            'user',
            'full_name',
            'phone',
            'address_line_1',
            'address_line_2',
            'city',
            'state',
            'postal_code',
            'country',
            'is_default',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

    def _handle_default_address(self, user, is_default, current_instance_id=None):
        if is_default:
            qs = Address.objects.filter(user=user)
            if current_instance_id:
                qs = qs.exclude(id=current_instance_id)
            qs.update(is_default=False)

    def create(self, validated_data):
        user = self.context['request'].user
        is_default = validated_data.get('is_default', False)
        # If this is the user's first address, force is_default to True
        if not Address.objects.filter(user=user).exists():
            is_default = True
            validated_data['is_default'] = True
        else:
            self._handle_default_address(user, is_default)
        validated_data['user'] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        is_default = validated_data.get('is_default', instance.is_default)
        self._handle_default_address(instance.user, is_default, current_instance_id=instance.id)
        return super().update(instance, validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'is_staff': self.user.is_staff,
        }
        return data
