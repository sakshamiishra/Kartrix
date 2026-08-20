from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from .models import Review, ReviewImage
from .serializers import (
    ReviewSerializer,
    ReviewCreateSerializer,
    ReviewUpdateSerializer,
)
from products.models import Product
from orders.models import Order, OrderItem


class ReviewPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class IsOwnerOrStaffForDelete(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_authenticated:
            if request.user.is_staff or obj.user == request.user:
                return True
        return False


class IsOwnerOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_authenticated and obj.user == request.user


class ReviewViewSet(viewsets.ModelViewSet):
    pagination_class = ReviewPagination

    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            return [IsOwnerOnly()]
        elif self.action == 'destroy':
            return [IsOwnerOrStaffForDelete()]
        elif self.action in ['create', 'my_reviews', 'reviewable_items']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticatedOrReadOnly()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReviewUpdateSerializer
        return ReviewSerializer

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            qs = Review.objects.all()
        else:
            qs = Review.objects.filter(is_approved=True)

        product_param = self.request.query_params.get('product')
        if product_param:
            if product_param.isdigit():
                qs = qs.filter(product_id=int(product_param))
            else:
                qs = qs.filter(product__slug=product_param)

        return qs.select_related('user', 'product', 'order_item').prefetch_related('images').order_by('-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reviews(self, request):
        reviews = Review.objects.filter(user=request.user).select_related('product').prefetch_related('images').order_by('-created_at')
        page = self.paginate_queryset(reviews)
        if page is not None:
            serializer = ReviewSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ReviewSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def reviewable_items(self, request):
        user = request.user
        # Find delivered & paid OrderItems
        delivered_items = OrderItem.objects.filter(
            order__user=user,
            order__status=Order.OrderStatus.DELIVERED,
            order__payment_status=Order.PaymentStatus.PAID
        ).select_related('product', 'order').order_by('-order__created_at')

        # Get list of product IDs user has already reviewed
        reviewed_product_ids = set(Review.objects.filter(user=user).values_list('product_id', flat=True))

        items_data = []
        seen_products = set()

        for item in delivered_items:
            if not item.product:
                continue
            p_id = item.product.id
            if p_id not in reviewed_product_ids and p_id not in seen_products:
                seen_products.add(p_id)
                primary_img = item.product.images.filter(is_primary=True).first() or item.product.images.first()
                img_url = primary_img.image.url if primary_img and primary_img.image else None

                items_data.append({
                    'order_item_id': item.id,
                    'order_number': item.order.order_number,
                    'product_id': item.product.id,
                    'product_name': item.product.name,
                    'product_slug': item.product.slug,
                    'primary_image': img_url,
                    'delivered_at': item.order.updated_at,
                })

        return Response(items_data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def summary(self, request):
        product_param = request.query_params.get('product')
        if not product_param:
            return Response({'detail': 'Product query parameter required.'}, status=status.HTTP_400_BAD_REQUEST)

        if product_param.isdigit():
            product = get_object_or_404(Product, pk=int(product_param))
        else:
            product = get_object_or_404(Product, slug=product_param)

        approved_reviews = Review.objects.filter(product=product, is_approved=True)

        total_count = approved_reviews.count()
        avg_rating = approved_reviews.aggregate(avg=Avg('rating'))['avg'] or 0.0
        avg_rating = round(float(avg_rating), 1)

        breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        counts = approved_reviews.values('rating').annotate(count=Count('rating'))
        for entry in counts:
            r = entry['rating']
            if r in breakdown:
                breakdown[r] = entry['count']

        return Response({
            'product_id': product.id,
            'product_name': product.name,
            'average_rating': avg_rating,
            'total_reviews': total_count,
            'rating_breakdown': breakdown,
        })
