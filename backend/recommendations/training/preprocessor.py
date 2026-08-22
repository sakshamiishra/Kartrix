import os
import json
import pickle
import math
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Any, Optional

import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
import torch


@dataclass
class PreprocessorConfig:
    csv_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'deepfm_training_data.csv'
    )
    encoders_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'encoders.pkl'
    )
    scaler_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'scaler.pkl'
    )
    feature_config_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'feature_config.json'
    )
    train_ratio: float = 0.8
    val_ratio: float = 0.1
    test_ratio: float = 0.1
    categorical_cols: List[str] = field(default_factory=lambda: [
        'user_id', 'product_id', 'category_id', 'brand_id'
    ])
    continuous_cols: List[str] = field(default_factory=lambda: ['price'])
    binary_cols: List[str] = field(default_factory=lambda: ['has_discount'])
    target_col: str = 'label'
    timestamp_col: str = 'timestamp'


class RecommendationDataPreprocessor:
    """
    Handles chronological temporal splitting, leakage-proof encoding and scaling,
    and serialization of preprocessing artifacts for the DeepFM recommendation model.
    """

    def __init__(self, config: Optional[PreprocessorConfig] = None):
        self.config = config or PreprocessorConfig()
        self.encoders: Dict[str, LabelEncoder] = {}
        self.scaler: Optional[StandardScaler] = None
        self.feature_info: Dict[str, Any] = {}

    def load_and_sort_data(self) -> pd.DataFrame:
        """Loads dataset CSV and sorts chronologically by timestamp."""
        if not os.path.exists(self.config.csv_path):
            raise FileNotFoundError(f"Training dataset CSV not found at: {self.config.csv_path}")

        df = pd.read_csv(self.config.csv_path)
        df[self.config.timestamp_col] = pd.to_datetime(df[self.config.timestamp_col])
        df = df.sort_values(by=self.config.timestamp_col).reset_index(drop=True)
        return df

    def temporal_split(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Splits chronologically into Train (80%), Validation (10%), and Test (10%)."""
        n = len(df)
        train_end = int(n * self.config.train_ratio)
        val_end = train_end + int(n * self.config.val_ratio)

        df_train = df.iloc[:train_end].copy().reset_index(drop=True)
        df_val = df.iloc[train_end:val_end].copy().reset_index(drop=True)
        df_test = df.iloc[val_end:].copy().reset_index(drop=True)

        return df_train, df_val, df_test

    def fit_transform(
        self, df_train: pd.DataFrame, df_val: pd.DataFrame, df_test: pd.DataFrame
    ) -> Tuple[
        Dict[str, torch.Tensor],
        Dict[str, torch.Tensor],
        Dict[str, torch.Tensor]
    ]:
        """
        Fits LabelEncoders and StandardScaler EXCLUSIVELY on df_train,
        then transforms df_train, df_val, and df_test without data leakage.
        """
        train_cat_arrays = []
        val_cat_arrays = []
        test_cat_arrays = []
        cardinalities = {}

        # 1. Encode Categorical Features
        for col in self.config.categorical_cols:
            le = LabelEncoder()
            # Fit strictly on train
            le.fit(df_train[col].astype(str))
            self.encoders[col] = le

            known_classes = set(le.classes_)
            # Reserve max_idx + 1 for unknown tokens [UNK] if needed
            unk_idx = len(le.classes_)
            cardinalities[col] = len(le.classes_) + 1

            def encode_series(series: pd.Series) -> np.ndarray:
                str_series = series.astype(str)
                encoded = np.zeros(len(series), dtype=np.int64)
                for idx, val in enumerate(str_series):
                    if val in known_classes:
                        encoded[idx] = le.transform([val])[0]
                    else:
                        encoded[idx] = unk_idx
                return encoded

            train_cat_arrays.append(encode_series(df_train[col]))
            val_cat_arrays.append(encode_series(df_val[col]))
            test_cat_arrays.append(encode_series(df_test[col]))

        # Combine categorical columns into 2D arrays (N, num_cat_features)
        X_train_cat = np.column_stack(train_cat_arrays)
        X_val_cat = np.column_stack(val_cat_arrays)
        X_test_cat = np.column_stack(test_cat_arrays)

        # 2. Transform Continuous Feature (price via log1p + StandardScaler)
        train_prices = np.log1p(df_train['price'].values).reshape(-1, 1)
        val_prices = np.log1p(df_val['price'].values).reshape(-1, 1)
        test_prices = np.log1p(df_test['price'].values).reshape(-1, 1)

        self.scaler = StandardScaler()
        train_scaled_price = self.scaler.fit_transform(train_prices)
        val_scaled_price = self.scaler.transform(val_prices)
        test_scaled_price = self.scaler.transform(test_prices)

        # 3. Binary Feature (has_discount)
        train_discount = df_train['has_discount'].values.astype(np.float32).reshape(-1, 1)
        val_discount = df_val['has_discount'].values.astype(np.float32).reshape(-1, 1)
        test_discount = df_test['has_discount'].values.astype(np.float32).reshape(-1, 1)

        # Combine continuous + binary into 2D dense arrays (N, num_dense_features)
        X_train_dense = np.column_stack([train_scaled_price, train_discount]).astype(np.float32)
        X_val_dense = np.column_stack([val_scaled_price, val_discount]).astype(np.float32)
        X_test_dense = np.column_stack([test_scaled_price, test_discount]).astype(np.float32)

        # 4. Target Labels
        y_train = df_train[self.config.target_col].values.astype(np.float32)
        y_val = df_val[self.config.target_col].values.astype(np.float32)
        y_test = df_test[self.config.target_col].values.astype(np.float32)

        # Record feature metadata
        self.feature_info = {
            'categorical_cols': self.config.categorical_cols,
            'cardinalities': cardinalities,
            'dense_cols': ['price_scaled', 'has_discount'],
            'num_dense_features': X_train_dense.shape[1],
            'train_size': len(df_train),
            'val_size': len(df_val),
            'test_size': len(df_test),
        }

        train_tensors = {
            'x_cat': torch.tensor(X_train_cat, dtype=torch.long),
            'x_dense': torch.tensor(X_train_dense, dtype=torch.float32),
            'y': torch.tensor(y_train, dtype=torch.float32)
        }
        val_tensors = {
            'x_cat': torch.tensor(X_val_cat, dtype=torch.long),
            'x_dense': torch.tensor(X_val_dense, dtype=torch.float32),
            'y': torch.tensor(y_val, dtype=torch.float32)
        }
        test_tensors = {
            'x_cat': torch.tensor(X_test_cat, dtype=torch.long),
            'x_dense': torch.tensor(X_test_dense, dtype=torch.float32),
            'y': torch.tensor(y_test, dtype=torch.float32)
        }

        return train_tensors, val_tensors, test_tensors

    def save_artifacts(self):
        """Serializes encoders.pkl, scaler.pkl, and feature_config.json."""
        out_dir = os.path.dirname(self.config.encoders_path)
        os.makedirs(out_dir, exist_ok=True)

        with open(self.config.encoders_path, 'wb') as f:
            pickle.dump(self.encoders, f)

        with open(self.config.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)

        with open(self.config.feature_config_path, 'w', encoding='utf-8') as f:
            json.dump(self.feature_info, f, indent=2)

    def prepare_all(self) -> Tuple[
        Dict[str, torch.Tensor],
        Dict[str, torch.Tensor],
        Dict[str, torch.Tensor],
        Dict[str, Any]
    ]:
        """Full pipeline execution: load -> split -> fit_transform -> save_artifacts."""
        df = self.load_and_sort_data()
        df_train, df_val, df_test = self.temporal_split(df)
        train_tensors, val_tensors, test_tensors = self.fit_transform(df_train, df_val, df_test)
        self.save_artifacts()
        return train_tensors, val_tensors, test_tensors, self.feature_info
