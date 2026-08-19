import django_filters
from django.db import models
from django.db.models import Q, F
from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(method='filter_category')
    brand = django_filters.CharFilter(method='filter_brand')
    min_price = django_filters.NumberFilter(field_name='variants__price', lookup_expr='gte', distinct=True)
    max_price = django_filters.NumberFilter(field_name='variants__price', lookup_expr='lte', distinct=True)
    is_active = django_filters.BooleanFilter(field_name='is_active')
    on_sale = django_filters.BooleanFilter(method='filter_on_sale')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'min_price', 'max_price', 'is_active', 'on_sale']

    def filter_category(self, queryset, name, value):
        if value.isdigit():
            return queryset.filter(category_id=int(value))
        return queryset.filter(category__slug=value)

    def filter_brand(self, queryset, name, value):
        if value.isdigit():
            return queryset.filter(brand_id=int(value))
        return queryset.filter(brand__slug=value)

    def filter_on_sale(self, queryset, name, value):
        if value:
            return queryset.filter(
                variants__is_active=True,
                variants__discount_price__isnull=False,
                variants__discount_price__lt=models.F('variants__price')
            ).distinct()
        return queryset

