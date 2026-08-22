import os
import json
import random
from dataclasses import dataclass, field
from typing import Dict, Any, Tuple, Optional, List

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score, log_loss

from recommendations.training.model import DeepFM


@dataclass
class TrainerConfig:
    model_save_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'deepfm_best.pt'
    )
    report_save_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data',
        'training_report.json'
    )
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    max_epochs: int = 50
    early_stopping_patience: int = 7
    lr_scheduler_patience: int = 3
    lr_scheduler_factor: float = 0.5
    seed: int = 42


def seed_everything(seed: int = 42):
    """Sets deterministic seeds across random, numpy, and PyTorch."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class DeepFMTrainer:
    """
    Manages the training, validation, early stopping, checkpointing, and evaluation
    pipeline for the DeepFM recommendation model.
    """

    def __init__(
        self,
        model: DeepFM,
        train_loader: DataLoader,
        val_loader: DataLoader,
        test_loader: DataLoader,
        config: Optional[TrainerConfig] = None,
        pos_weight: Optional[float] = None
    ):
        self.config = config or TrainerConfig()
        seed_everything(self.config.seed)

        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = model.to(self.device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.test_loader = test_loader

        # BCEWithLogitsLoss with optional pos_weight for class imbalance
        if pos_weight is not None:
            pw_tensor = torch.tensor([pos_weight], dtype=torch.float32, device=self.device)
            self.criterion = nn.BCEWithLogitsLoss(pos_weight=pw_tensor)
        else:
            self.criterion = nn.BCEWithLogitsLoss()

        self.optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay
        )

        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='max',
            factor=self.config.lr_scheduler_factor,
            patience=self.config.lr_scheduler_patience
        )

    def _compute_metrics(self, y_true: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
        """Calculates ROC-AUC and LogLoss metrics."""
        # Handle edge cases where single class present in mini-eval
        if len(np.unique(y_true)) < 2:
            auc = 0.5
        else:
            auc = float(roc_auc_score(y_true, y_prob))

        # Clip probabilities for stable log loss
        y_prob_clipped = np.clip(y_prob, 1e-7, 1.0 - 1e-7)
        ll = float(log_loss(y_true, y_prob_clipped))

        return {'auc': round(auc, 4), 'log_loss': round(ll, 4)}

    def train_one_epoch(self) -> float:
        """Runs one full training epoch and returns average training loss."""
        self.model.train()
        total_loss = 0.0
        total_samples = 0

        for x_cat, x_dense, y in self.train_loader:
            x_cat = x_cat.to(self.device)
            x_dense = x_dense.to(self.device)
            y = y.to(self.device).unsqueeze(1)

            self.optimizer.zero_grad()
            logits = self.model(x_cat, x_dense)
            loss = self.criterion(logits, y)
            loss.backward()
            self.optimizer.step()

            total_loss += loss.item() * x_cat.size(0)
            total_samples += x_cat.size(0)

        return total_loss / max(total_samples, 1)

    def evaluate(self, loader: DataLoader) -> Dict[str, float]:
        """Evaluates the model on a DataLoader and returns loss, AUC, and LogLoss."""
        self.model.eval()
        total_loss = 0.0
        total_samples = 0
        all_y_true = []
        all_y_prob = []

        with torch.no_grad():
            for x_cat, x_dense, y in loader:
                x_cat = x_cat.to(self.device)
                x_dense = x_dense.to(self.device)
                y_target = y.to(self.device).unsqueeze(1)

                logits = self.model(x_cat, x_dense)
                loss = self.criterion(logits, y_target)
                probs = torch.sigmoid(logits).cpu().numpy().flatten()

                total_loss += loss.item() * x_cat.size(0)
                total_samples += x_cat.size(0)

                all_y_true.extend(y.numpy())
                all_y_prob.extend(probs)

        avg_loss = total_loss / max(total_samples, 1)
        metrics = self._compute_metrics(np.array(all_y_true), np.array(all_y_prob))
        metrics['loss'] = round(avg_loss, 4)
        return metrics

    def compute_ranking_metrics(self, loader: DataLoader, k_list: List[int] = None) -> Dict[str, float]:
        """
        Computes Hit Rate @ K and NDCG @ K ranking metrics across test interactions.
        Groups candidates per user to evaluate candidate recommendation ordering.
        """
        if k_list is None:
            k_list = [3, 5]

        self.model.eval()
        user_interactions = {}

        with torch.no_grad():
            for x_cat, x_dense, y in loader:
                x_cat_dev = x_cat.to(self.device)
                x_dense_dev = x_dense.to(self.device)
                probs = torch.sigmoid(self.model(x_cat_dev, x_dense_dev)).cpu().numpy().flatten()

                for i in range(len(y)):
                    uid = int(x_cat[i, 0].item())
                    label = int(y[i].item())
                    score = float(probs[i])

                    if uid not in user_interactions:
                        user_interactions[uid] = []
                    user_interactions[uid].append((score, label))

        ranking_results = {}
        for k in k_list:
            hits = []
            ndcgs = []

            for uid, items in user_interactions.items():
                positives = [item for item in items if item[1] == 1]
                if not positives:
                    continue  # Skip users with no positive targets in split

                # Sort by predicted score descending
                sorted_items = sorted(items, key=lambda x: x[0], reverse=True)[:k]
                has_hit = any(item[1] == 1 for item in sorted_items)
                hits.append(1.0 if has_hit else 0.0)

                # Compute Discounted Cumulative Gain (DCG)
                dcg = sum(item[1] / np.log2(idx + 2) for idx, item in enumerate(sorted_items))
                # Compute Ideal DCG (IDCG)
                ideal_items = sorted(items, key=lambda x: x[1], reverse=True)[:k]
                idcg = sum(item[1] / np.log2(idx + 2) for idx, item in enumerate(ideal_items))

                ndcg = (dcg / idcg) if idcg > 0 else 0.0
                ndcgs.append(ndcg)

            ranking_results[f'hit_rate_{k}'] = round(float(np.mean(hits)), 4) if hits else 0.0
            ranking_results[f'ndcg_{k}'] = round(float(np.mean(ndcgs)), 4) if ndcgs else 0.0

        return ranking_results

    def fit(self) -> Dict[str, Any]:
        """
        Executes the main training loop with early stopping and checkpointing.
        Returns full training history and final evaluation report.
        """
        best_val_auc = -1.0
        best_epoch = 0
        patience_counter = 0
        history = []

        out_dir = os.path.dirname(self.config.model_save_path)
        os.makedirs(out_dir, exist_ok=True)

        for epoch in range(1, self.config.max_epochs + 1):
            train_loss = self.train_one_epoch()
            val_metrics = self.evaluate(self.val_loader)

            val_auc = val_metrics['auc']
            val_loss = val_metrics['loss']

            self.scheduler.step(val_auc)

            epoch_record = {
                'epoch': epoch,
                'train_loss': round(train_loss, 4),
                'val_loss': val_loss,
                'val_auc': val_auc,
                'val_log_loss': val_metrics['log_loss'],
            }
            history.append(epoch_record)

            if val_auc > best_val_auc:
                best_val_auc = val_auc
                best_epoch = epoch
                patience_counter = 0
                # Save best checkpoint
                torch.save(self.model.state_dict(), self.config.model_save_path)
            else:
                patience_counter += 1
                if patience_counter >= self.config.early_stopping_patience:
                    break

        # Load best checkpoint for final evaluation
        if os.path.exists(self.config.model_save_path):
            self.model.load_state_dict(
                torch.load(self.config.model_save_path, map_location=self.device)
            )

        test_metrics = self.evaluate(self.test_loader)
        ranking_metrics = self.compute_ranking_metrics(self.test_loader)

        report = {
            'best_epoch': best_epoch,
            'best_val_auc': best_val_auc,
            'test_metrics': test_metrics,
            'ranking_metrics': ranking_metrics,
            'history': history,
            'model_save_path': self.config.model_save_path,
        }

        with open(self.config.report_save_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)

        return report
