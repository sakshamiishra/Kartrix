from rest_framework import serializers
from products.serializers import ProductListSerializer


class RecommendationResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    recommendation_type = serializers.CharField()
    results = ProductListSerializer(many=True, source='products')
