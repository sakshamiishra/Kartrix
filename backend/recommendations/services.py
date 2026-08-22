import os
import csv
import logging
from typing import Dict, Any, Optional, List
from django.db.models import Q, Avg, Count, FloatField
from django.db.models.functions import Coalesce

from products.models import Product
from recommendations.data.generator import SyntheticInteractionGenerator, SyntheticGeneratorConfig
from recommendations.inference.engine import DeepFMInferenceEngine

logger = logging.getLogger(__name__)


def generate_synthetic_dataset(
    num_interactions: int = 25000,
    seed: int = 42,
    output_path: Optional[str] = None,
    num_synthetic_users: int = 200,
) -> Dict[str, Any]:
    """
    Service wrapper for generating synthetic interaction datasets for DeepFM training.
    """
    config = SyntheticGeneratorConfig(
        num_interactions=num_interactions,
        seed=seed,
        num_synthetic_users=num_synthetic_users,
    )
    if output_path:
        config.output_path = output_path

    generator = SyntheticInteractionGenerator(config=config)
    return generator.generate()


def get_dataset_summary(csv_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Reads and returns summary statistics of the generated dataset CSV file.
    """
    if not csv_path:
        config = SyntheticGeneratorConfig()
        csv_path = config.output_path

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset CSV file not found at path: {csv_path}")

    total_rows = 0
    positive_count = 0
    negative_count = 0
    interaction_counts = {}
    unique_users = set()
    unique_products = set()
    unique_categories = set()
    unique_brands = set()
    sample_rows = []

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            unique_users.add(row['user_id'])
            unique_products.add(row['product_id'])
            unique_categories.add(row['category_id'])
            unique_brands.add(row['brand_id'])
            lbl = int(row['label'])
            if lbl == 1:
                positive_count += 1
            else:
                negative_count += 1

            itype = row['interaction_type']
            interaction_counts[itype] = interaction_counts.get(itype, 0) + 1

            if len(sample_rows) < 5:
                sample_rows.append(dict(row))

    return {
        'csv_path': csv_path,
        'total_rows': total_rows,
        'unique_users_count': len(unique_users),
        'unique_products_count': len(unique_products),
        'unique_categories_count': len(unique_categories),
        'unique_brands_count': len(unique_brands),
        'positive_labels': positive_count,
        'negative_labels': negative_count,
        'positive_ratio': round(positive_count / total_rows, 4) if total_rows > 0 else 0.0,
        'interaction_distribution': interaction_counts,
        'sample_rows': sample_rows,
    }


def get_basic_recommendations(category_id: Optional[int] = None, limit: int = 6) -> List[Product]:
    """
    Fallback deterministic recommendation engine.
    Ranks active products by average rating, review count, and recency.
    """
    qs = Product.objects.filter(is_active=True)
    if category_id is not None:
        qs = qs.filter(category_id=category_id)

    qs = (
        qs.annotate(
            average_rating=Coalesce(
                Avg('reviews__rating', filter=Q(reviews__is_approved=True)),
                0.0,
                output_field=FloatField()
            ),
            review_count=Count('reviews', filter=Q(reviews__is_approved=True))
        )
        .select_related('category', 'brand')
        .prefetch_related('images', 'variants')
        .order_by('-average_rating', '-review_count', '-created_at')
        .distinct()
    )
    return list(qs[:limit])


def get_recommendations(
    user: Optional[Any] = None,
    category_id: Optional[int] = None,
    limit: int = 6
) -> Dict[str, Any]:
    """
    Coordinates candidate retrieval, user eligibility check, DeepFM scoring,
    and automatic basic recommendation fallback.
    """
    engine = DeepFMInferenceEngine.get_instance()

    # 1. User eligibility check (Must be authenticated and present in training encoder)
    if engine.is_user_eligible(user):
        try:
            candidates_qs = Product.objects.filter(is_active=True)
            if category_id is not None:
                candidates_qs = candidates_qs.filter(category_id=category_id)

            candidates_qs = candidates_qs.select_related('category', 'brand').prefetch_related('images', 'variants').distinct()
            candidates_list = list(candidates_qs)

            if candidates_list:
                scored = engine.score_candidates(user, candidates_list)
                ranked_products = [p for p, score in scored[:limit]]
                return {
                    'recommendation_type': 'DEEPFM_PERSONALIZED',
                    'count': len(ranked_products),
                    'products': ranked_products,
                }
        except Exception as e:
            logger.warning(
                f"DeepFM inference failed for user {getattr(user, 'id', None)}: {str(e)}. "
                "Falling back to basic recommendation engine."
            )

    # 2. Fallback to basic deterministic recommendations
    basic_products = get_basic_recommendations(category_id=category_id, limit=limit)
    return {
        'recommendation_type': 'BASIC_FALLBACK',
        'count': len(basic_products),
        'products': basic_products,
    }
