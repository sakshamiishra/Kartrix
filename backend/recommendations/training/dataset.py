import random
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Dict, Tuple


class RecommendationDataset(Dataset):
    """
    PyTorch Dataset wrapping categorical indices tensor, continuous/dense features tensor,
    and binary target label tensor for DeepFM.
    """

    def __init__(
        self,
        x_cat: torch.Tensor,
        x_dense: torch.Tensor,
        y: torch.Tensor
    ):
        assert len(x_cat) == len(x_dense) == len(y), "Tensors must have matching length"
        self.x_cat = x_cat
        self.x_dense = x_dense
        self.y = y

    def __len__(self) -> int:
        return len(self.y)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.x_cat[idx], self.x_dense[idx], self.y[idx]


def seed_worker(worker_id: int):
    """Ensures DataLoader multi-worker determinism."""
    worker_seed = torch.initial_seed() % 2**32
    np.random.seed(worker_seed)
    random.seed(worker_seed)


def create_dataloaders(
    train_tensors: Dict[str, torch.Tensor],
    val_tensors: Dict[str, torch.Tensor],
    test_tensors: Dict[str, torch.Tensor],
    batch_size: int = 512,
    seed: int = 42
) -> Tuple[DataLoader, DataLoader, DataLoader]:
    """
    Creates PyTorch DataLoaders with deterministic seeding for train, val, and test splits.
    """
    g = torch.Generator()
    g.manual_seed(seed)

    train_ds = RecommendationDataset(
        train_tensors['x_cat'], train_tensors['x_dense'], train_tensors['y']
    )
    val_ds = RecommendationDataset(
        val_tensors['x_cat'], val_tensors['x_dense'], val_tensors['y']
    )
    test_ds = RecommendationDataset(
        test_tensors['x_cat'], test_tensors['x_dense'], test_tensors['y']
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        worker_init_fn=seed_worker,
        generator=g
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False
    )

    return train_loader, val_loader, test_loader
