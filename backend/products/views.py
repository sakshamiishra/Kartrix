from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductAttribute,
    AttributeValue,
    ProductVariant,
    Inventory,
    InventoryTransaction,
)
from .permissions import IsAdminOrReadOnly, IsStaffUser
from .filters import ProductFilter
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    ProductImageSerializer,
    ProductAttributeSerializer,
    AttributeValueSerializer,
    ProductVariantSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
    InventorySerializer,
    InventoryTransactionSerializer,
)


class CatalogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CategorySerializer
    pagination_class = CatalogPagination


    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            return Category.objects.all().order_by('name')
        return Category.objects.filter(is_active=True).order_by('name')

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        if lookup_value.isdigit():
            filter_kwargs = {'pk': int(lookup_value)}
        else:
            filter_kwargs = {'slug': lookup_value}
        obj = generics_get_object_or_404(queryset, filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj


def generics_get_object_or_404(queryset, filter_kwargs):
    from django.shortcuts import get_object_or_404
    return get_object_or_404(queryset, **filter_kwargs)


class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = BrandSerializer
    pagination_class = CatalogPagination


    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            return Brand.objects.all().order_by('name')
        return Brand.objects.filter(is_active=True).order_by('name')

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        if lookup_value.isdigit():
            filter_kwargs = {'pk': int(lookup_value)}
        else:
            filter_kwargs = {'slug': lookup_value}
        obj = generics_get_object_or_404(queryset, filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj


from django.db.models import Q, Avg, Count, FloatField
from django.db.models.functions import Coalesce

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = CatalogPagination
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'brand__name', 'category__name', 'sku']
    ordering_fields = ['name', 'created_at', 'variants__price']

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            qs = Product.objects.all()
        else:
            qs = Product.objects.filter(is_active=True)
        return (
            qs.annotate(
                average_rating=Coalesce(Avg('reviews__rating', filter=Q(reviews__is_approved=True)), 0.0, output_field=FloatField()),
                review_count=Count('reviews', filter=Q(reviews__is_approved=True))
            )
            .select_related('category', 'brand')
            .prefetch_related('images', 'variants')
            .order_by('-created_at')
            .distinct()
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductCreateUpdateSerializer

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs[lookup_url_kwarg]
        if lookup_value.isdigit():
            filter_kwargs = {'pk': int(lookup_value)}
        else:
            filter_kwargs = {'slug': lookup_value}
        obj = generics_get_object_or_404(queryset, filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj


class ProductImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ProductImageSerializer
    queryset = ProductImage.objects.all().order_by('display_order', 'id')


class ProductAttributeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ProductAttributeSerializer
    queryset = ProductAttribute.objects.all().order_by('name')


class AttributeValueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AttributeValueSerializer
    queryset = AttributeValue.objects.all().select_related('attribute')


class ProductVariantViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = ProductVariantSerializer

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            return ProductVariant.objects.all().select_related('product', 'inventory').prefetch_related('attribute_values')
        return ProductVariant.objects.filter(is_active=True).select_related('product', 'inventory').prefetch_related('attribute_values')


class InventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = InventorySerializer
    queryset = Inventory.objects.all().select_related('product_variant')


class InventoryTransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    serializer_class = InventoryTransactionSerializer
    queryset = InventoryTransaction.objects.all().select_related('inventory', 'created_by').order_by('-created_at')
