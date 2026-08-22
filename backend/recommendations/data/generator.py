import os
import csv
import random
import math
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from products.models import Product, Category, Brand


@dataclass
class SyntheticGeneratorConfig:
    num_interactions: int = 25000
    seed: int = 42
    output_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'deepfm_training_data.csv'
    )
    days_range: int = 90
    min_products_required: int = 2
    min_categories_required: int = 1

    # Virtual synthetic users — these IDs exist ONLY in the training CSV,
    # never as real Django User records. DeepFM's LabelEncoder maps them
    # to embedding indices 0..N-1 regardless.
    num_synthetic_users: int = 200
    synthetic_user_id_start: int = 1001

    # Interaction weights and labels mapping
    interaction_types: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        'PURCHASE': {'weight': 1.0, 'label': 1},
        'ADD_TO_WISHLIST': {'weight': 0.8, 'label': 1},
        'ADD_TO_CART': {'weight': 0.6, 'label': 1},
        'PRODUCT_VIEW': {'weight': 0.2, 'label': 1},
        'DISMISSED': {'weight': 0.0, 'label': 0},
    })


class SyntheticInteractionGenerator:
    """
    Generates a realistic synthetic interaction dataset for DeepFM model training
    by fetching real Products, Categories, and Brands from the Django database
    and modeling latent user preferences with virtual synthetic user IDs.

    IMPORTANT: The generated user IDs (default range 1001–1200) are virtual —
    they do NOT correspond to real Django User records. This is intentional:
    DeepFM treats user_id as a categorical feature and encodes it via
    LabelEncoder during preprocessing. The model only needs consistent IDs,
    not actual database foreign keys.
    """

    def __init__(self, config: Optional[SyntheticGeneratorConfig] = None):
        self.config = config or SyntheticGeneratorConfig()
        self.rng = random.Random(self.config.seed)

    def validate_entities(self):
        """Validates that the database has sufficient active entities to generate dataset."""
        products_count = Product.objects.filter(is_active=True).count()
        categories_count = Category.objects.filter(is_active=True).count()

        if products_count < self.config.min_products_required:
            raise ValueError(
                f"Insufficient active products in database. Required at least "
                f"{self.config.min_products_required}, found {products_count}."
            )
        if categories_count < self.config.min_categories_required:
            raise ValueError(
                f"Insufficient active categories in database. Required at least "
                f"{self.config.min_categories_required}, found {categories_count}."
            )
        if self.config.num_synthetic_users < 2:
            raise ValueError(
                f"num_synthetic_users must be at least 2, got {self.config.num_synthetic_users}."
            )

    def _get_product_metadata(self) -> List[Dict[str, Any]]:
        """Fetches active products and extracts effective price, category, brand IDs, and discount status."""
        products = Product.objects.filter(is_active=True).select_related(
            'category', 'brand'
        ).prefetch_related('variants')
        product_data = []

        for p in products:
            variant = p.variants.filter(is_active=True).first()
            if variant:
                has_discount = 1 if variant.discount_price else 0
                price = float(variant.discount_price if variant.discount_price else variant.price)
            else:
                has_discount = 0
                price = 999.00  # Fallback default price

            product_data.append({
                'id': p.id,
                'category_id': p.category.id,
                'brand_id': p.brand.id if p.brand else 0,
                'price': round(price, 2),
                'has_discount': has_discount,
            })

        return product_data

    def _generate_synthetic_user_ids(self) -> List[int]:
        """Generates virtual synthetic user IDs that exist only in the training CSV."""
        start = self.config.synthetic_user_id_start
        count = self.config.num_synthetic_users
        return list(range(start, start + count))

    def _generate_user_profiles(
        self,
        user_ids: List[int],
        product_data: List[Dict[str, Any]],
        categories: List[int],
        brands: List[int],
    ) -> Dict[int, Dict[str, Any]]:
        """
        Generates deterministic latent preference profiles for each virtual user.

        Each user gets:
        - 1-3 strongly preferred categories (with a high affinity bonus)
        - 0-2 strongly preferred brands
        - A target price point with variance
        - A discount sensitivity flag

        The bonuses are calibrated so that preferred-category products receive
        a substantial scoring advantage, producing clearly distinguishable
        behavioral clusters across users.
        """
        all_prices = [p['price'] for p in product_data]
        min_price = min(all_prices) if all_prices else 100.0
        max_price = max(all_prices) if all_prices else 50000.0

        user_profiles = {}
        for uid in user_ids:
            # Deterministic user RNG using seed + user_id
            user_rng = random.Random(self.config.seed + uid * 31)

            # Assign preferred categories (1-3 categories)
            num_cats = min(len(categories), user_rng.randint(1, min(3, len(categories))))
            pref_cats = set(user_rng.sample(categories, num_cats)) if categories else set()

            # Assign preferred brands (0-2 brands)
            num_brands = min(len(brands), user_rng.randint(0, min(2, len(brands)))) if brands else 0
            pref_brands = set(user_rng.sample(brands, num_brands)) if brands else set()

            # Assign price preference (target price and variance)
            target_price = user_rng.uniform(min_price, max_price)

            # Discount sensitivity: ~40% of users are deal-seekers
            discount_sensitive = user_rng.random() < 0.4

            user_profiles[uid] = {
                'preferred_categories': pref_cats,
                'preferred_brands': pref_brands,
                'target_price': target_price,
                'discount_sensitive': discount_sensitive,
            }

        return user_profiles

    def generate(self) -> Dict[str, Any]:
        """
        Executes the dataset generation pipeline, saves the CSV dataset,
        and returns detailed dataset statistics.

        Uses virtual synthetic user IDs (not real Django User records)
        and deterministic timestamps anchored to the seed (not wall-clock time).
        """
        self.validate_entities()

        # Use virtual synthetic user IDs — NO real Django Users queried
        user_ids = self._generate_synthetic_user_ids()
        product_data = self._get_product_metadata()
        category_ids = list(Category.objects.filter(is_active=True).values_list('id', flat=True))
        brand_ids = list(Brand.objects.filter(is_active=True).values_list('id', flat=True))

        user_profiles = self._generate_user_profiles(user_ids, product_data, category_ids, brand_ids)

        # Deterministic reference time anchored to seed, not wall-clock
        reference_end = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=self.config.days_range)

        rows = []
        interaction_counts = {itype: 0 for itype in self.config.interaction_types}

        for i in range(self.config.num_interactions):
            uid = self.rng.choice(user_ids)
            profile = user_profiles[uid]

            # Calculate preference affinity scores for each product
            scored_products = []
            for prod in product_data:
                score = 0.2  # Reduced base affinity score (was 0.5)

                # Strong category preference bonus
                if prod['category_id'] in profile['preferred_categories']:
                    score += 2.5  # Increased from 1.5

                # Strong brand preference bonus
                if prod['brand_id'] in profile['preferred_brands']:
                    score += 2.0  # Increased from 1.2

                # Price distance penalty
                price_diff = abs(prod['price'] - profile['target_price'])
                price_factor = math.exp(-price_diff / max(profile['target_price'], 100.0))
                score += price_factor * 1.0

                # Discount sensitivity bonus for deal-seekers
                if profile['discount_sensitive'] and prod['has_discount'] == 1:
                    score += 0.8

                # Controlled random noise (reduced from 0.0-0.5)
                score += self.rng.uniform(0.0, 0.3)
                scored_products.append((score, prod))

            # Select product proportionally to affinity score
            total_score = sum(s[0] for s in scored_products)
            weights = [s[0] / total_score for s in scored_products]
            selected_prod = self.rng.choices(
                [s[1] for s in scored_products], weights=weights, k=1
            )[0]

            # Determine interaction type based on score quantile
            selected_score = next(
                s[0] for s in scored_products if s[1]['id'] == selected_prod['id']
            )
            max_possible_score = 6.8  # Updated: 0.2 + 2.5 + 2.0 + 1.0 + 0.8 + 0.3
            affinity_ratio = min(selected_score / max_possible_score, 1.0)

            if affinity_ratio > 0.65:
                # High affinity -> Strong intent / conversion
                itype = self.rng.choices(
                    ['PURCHASE', 'ADD_TO_WISHLIST', 'ADD_TO_CART', 'PRODUCT_VIEW'],
                    weights=[0.40, 0.30, 0.20, 0.10],
                    k=1
                )[0]
            elif affinity_ratio > 0.40:
                # Medium affinity -> Mixed engagement / view / cart
                itype = self.rng.choices(
                    ['PURCHASE', 'ADD_TO_CART', 'ADD_TO_WISHLIST', 'PRODUCT_VIEW', 'DISMISSED'],
                    weights=[0.10, 0.25, 0.25, 0.30, 0.10],
                    k=1
                )[0]
            else:
                # Low affinity -> View or Dismissed negative
                itype = self.rng.choices(
                    ['PRODUCT_VIEW', 'DISMISSED'],
                    weights=[0.35, 0.65],
                    k=1
                )[0]

            itype_info = self.config.interaction_types[itype]
            interaction_counts[itype] += 1

            # Generate deterministic random timestamp within range
            random_offset_seconds = self.rng.randint(0, self.config.days_range * 86400)
            timestamp_dt = reference_end - timedelta(days=self.config.days_range) + timedelta(seconds=random_offset_seconds)
            timestamp_str = timestamp_dt.strftime('%Y-%m-%dT%H:%M:%SZ')

            rows.append({
                'user_id': uid,
                'product_id': selected_prod['id'],
                'category_id': selected_prod['category_id'],
                'brand_id': selected_prod['brand_id'],
                'price': selected_prod['price'],
                'has_discount': selected_prod['has_discount'],
                'interaction_type': itype,
                'interaction_weight': itype_info['weight'],
                'timestamp': timestamp_str,
                'label': itype_info['label'],
            })

        # Save to CSV
        output_dir = os.path.dirname(self.config.output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        fieldnames = [
            'user_id', 'product_id', 'category_id', 'brand_id',
            'price', 'has_discount', 'interaction_type', 'interaction_weight',
            'timestamp', 'label',
        ]

        with open(self.config.output_path, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        positive_count = sum(1 for r in rows if r['label'] == 1)
        negative_count = sum(1 for r in rows if r['label'] == 0)
        unique_users = len(set(r['user_id'] for r in rows))

        stats = {
            'total_rows': len(rows),
            'unique_users': unique_users,
            'unique_products': len(set(r['product_id'] for r in rows)),
            'unique_categories': len(set(r['category_id'] for r in rows)),
            'unique_brands': len(set(r['brand_id'] for r in rows)),
            'positive_labels': positive_count,
            'negative_labels': negative_count,
            'positive_ratio': round(positive_count / len(rows), 4) if rows else 0.0,
            'interaction_distribution': interaction_counts,
            'output_path': self.config.output_path,
        }

        return stats
