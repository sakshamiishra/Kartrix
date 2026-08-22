from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

from .services import get_recommendations
from .serializers import RecommendationResponseSerializer


class RecommendationListView(APIView):
    """
    API endpoint that returns product recommendations.
    Uses DeepFM personalized ranking for eligible authenticated users,
    and automatically falls back to basic deterministic recommendations for
    anonymous, cold-start, or unrepresented users.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Retrieve Product Recommendations",
        description=(
            "Returns personalized product recommendations using DeepFM for eligible authenticated users, "
            "or basic popular product recommendations for anonymous/cold-start users."
        ),
        parameters=[
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Maximum number of recommendations to return (default: 6, max: 50).'
            ),
            OpenApiParameter(
                name='category_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Optional category ID to filter candidate recommendations.'
            ),
        ],
        responses={200: RecommendationResponseSerializer}
    )
    def get(self, request, *args, **kwargs):
        limit_param = request.query_params.get('limit', 6)
        category_param = request.query_params.get('category_id', None)

        try:
            limit = int(limit_param)
            if limit <= 0:
                return Response(
                    {"detail": "Parameter 'limit' must be a positive integer."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            limit = min(limit, 50)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Parameter 'limit' must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST
            )

        category_id = None
        if category_param is not None:
            try:
                category_id = int(category_param)
                if category_id <= 0:
                    return Response(
                        {"detail": "Parameter 'category_id' must be a positive integer."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                return Response(
                    {"detail": "Parameter 'category_id' must be a valid integer."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        recommendation_data = get_recommendations(
            user=request.user if request.user and request.user.is_authenticated else None,
            category_id=category_id,
            limit=limit
        )

        serializer = RecommendationResponseSerializer(
            recommendation_data,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)
