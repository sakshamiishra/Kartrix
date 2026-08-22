import os
import json
import pickle
import math
import logging
import numpy as np
import torch
from typing import List, Tuple, Dict, Any, Optional

from products.models import Product, Category
from recommendations.training.model import DeepFM

logger = logging.getLogger(__name__)


class DeepFMInferenceEngine:
    """
    In-process singleton DeepFM recommendation inference engine.
    Handles artifact loading, user eligibility verification, candidate batch scoring,
    and score-based ranking with fallback handling.
    """

    _instance: Optional['DeepFMInferenceEngine'] = None

    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            data_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'data'
            )
        self.data_dir = data_dir
        self.checkpoint_path = os.path.join(self.data_dir, 'deepfm_best.pt')
        self.encoders_path = os.path.join(self.data_dir, 'encoders.pkl')
        self.scaler_path = os.path.join(self.data_dir, 'scaler.pkl')
        self.feature_config_path = os.path.join(self.data_dir, 'feature_config.json')

        self.model: Optional[DeepFM] = None
        self.encoders: Optional[Dict[str, Any]] = None
        self.scaler: Optional[Any] = None
        self.feature_config: Optional[Dict[str, Any]] = None
        self._is_loaded: bool = False

    @classmethod
    def get_instance(cls, data_dir: Optional[str] = None) -> 'DeepFMInferenceEngine':
        if cls._instance is None:
            cls._instance = cls(data_dir=data_dir)
        return cls._instance

    def load_artifacts(self) -> bool:
        """Loads model checkpoint, label encoders, scaler, and feature config if available."""
        if self._is_loaded and self.model is not None:
            return True

        required_paths = [
            self.checkpoint_path,
            self.encoders_path,
            self.scaler_path,
            self.feature_config_path,
        ]
        for path in required_paths:
            if not os.path.exists(path):
                logger.warning(f"DeepFM inference artifact missing: {path}")
                self._is_loaded = False
                return False

        try:
            with open(self.encoders_path, 'rb') as f:
                self.encoders = pickle.load(f)

            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)

            with open(self.feature_config_path, 'r', encoding='utf-8') as f:
                self.feature_config = json.load(f)

            cardinalities = self.feature_config['cardinalities']
            num_dense = self.feature_config.get('num_dense_features', 2)

            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            model = DeepFM(
                cardinalities=cardinalities,
                embedding_dims={
                    'user_id': 16,
                    'product_id': 16,
                    'category_id': 8,
                    'brand_id': 8,
                },
                num_dense_features=num_dense,
                fm_k=16,
                dnn_hidden_units=[128, 64, 32],
                dropout_rate=0.3,
            )

            state_dict = torch.load(self.checkpoint_path, map_location=device)
            model.load_state_dict(state_dict)
            model.to(device)
            model.eval()

            self.model = model
            self.device = device
            self._is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize DeepFM inference engine: {str(e)}", exc_info=True)
            self.model = None
            self._is_loaded = False
            return False

    def is_user_eligible(self, user) -> bool:
        """
        Verifies if an authenticated user is sufficiently represented in the trained model.
        Returns False for anonymous users, new users, or users not present in training encoders.
        """
        if user is None or not getattr(user, 'is_authenticated', False):
            return False

        if not self.load_artifacts() or self.encoders is None:
            return False

        user_encoder = self.encoders.get('user_id')
        if not user_encoder or not hasattr(user_encoder, 'classes_'):
            return False

        user_str = str(user.id)
        return user_str in set(user_encoder.classes_)

    def score_candidates(
        self, user, candidates: List[Product]
    ) -> List[Tuple[Product, float]]:
        """
        Computes batch DeepFM predicted probabilities for candidate products.
        Returns list of (product, score) sorted descending by predicted probability.
        """
        if not candidates or not self.load_artifacts() or self.model is None:
            return []

        user_str = str(user.id)
        user_enc = self.encoders['user_id']
        prod_enc = self.encoders['product_id']
        cat_enc = self.encoders['category_id']
        brand_enc = self.encoders['brand_id']

        user_idx = user_enc.transform([user_str])[0]

        prod_known = set(prod_enc.classes_)
        prod_unk = len(prod_enc.classes_)

        cat_known = set(cat_enc.classes_)
        cat_unk = len(cat_enc.classes_)

        brand_known = set(brand_enc.classes_)
        brand_unk = len(brand_enc.classes_)

        cat_rows = []
        prices_list = []
        discounts_list = []

        for p in candidates:
            # 1. Product ID
            pid_str = str(p.id)
            pid_idx = prod_enc.transform([pid_str])[0] if pid_str in prod_known else prod_unk

            # 2. Category ID
            cid_str = str(p.category_id)
            cid_idx = cat_enc.transform([cid_str])[0] if cid_str in cat_known else cat_unk

            # 3. Brand ID
            bid_str = str(p.brand_id) if p.brand_id else '0'
            bid_idx = brand_enc.transform([bid_str])[0] if bid_str in brand_known else brand_unk

            cat_rows.append([user_idx, pid_idx, cid_idx, bid_idx])

            # Variant price & discount feature extraction
            variant = p.variants.filter(is_active=True).first() if hasattr(p, 'variants') else None
            if variant:
                raw_price = float(variant.price)
                has_disc = 1.0 if (variant.discount_price and float(variant.discount_price) < raw_price) else 0.0
            else:
                raw_price = 1000.0
                has_disc = 0.0

            log_price = math.log1p(max(raw_price, 0.0))
            prices_list.append([log_price])
            discounts_list.append([has_disc])

        # Batch preprocessing transformations
        scaled_prices = self.scaler.transform(np.array(prices_list))
        dense_rows = np.column_stack([scaled_prices, np.array(discounts_list)]).astype(np.float32)

        x_cat = torch.tensor(cat_rows, dtype=torch.long, device=self.device)
        x_dense = torch.tensor(dense_rows, dtype=torch.float32, device=self.device)

        with torch.no_grad():
            logits = self.model(x_cat, x_dense)
            probs = torch.sigmoid(logits).cpu().numpy().flatten()

        scored_candidates = [(p, float(score)) for p, score in zip(candidates, probs)]
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        return scored_candidates
