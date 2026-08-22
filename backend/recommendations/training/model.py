import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Any


class DeepFM(nn.Module):
    """
    DeepFM Architecture for Click-Through Rate / Purchase Intent Recommendation.
    Combines:
      1. 1st-Order Linear Component (Main effects)
      2. 2nd-Order Factorization Machine Component (Pairwise feature interactions)
      3. Deep Neural Network Component (Higher-order non-linear combinations)

    Inputs:
      - x_cat: Categorical tensor of shape (batch_size, num_cat_features)
        Columns: [user_id, product_id, category_id, brand_id]
      - x_dense: Continuous/Binary tensor of shape (batch_size, num_dense_features)
        Columns: [price_scaled, has_discount]

    Output:
      - Raw logit scalar of shape (batch_size, 1) for BCEWithLogitsLoss.
    """

    def __init__(
        self,
        cardinalities: Dict[str, int],
        embedding_dims: Dict[str, int] = None,
        num_dense_features: int = 2,
        fm_k: int = 16,
        dnn_hidden_units: List[int] = None,
        dropout_rate: float = 0.3,
    ):
        super(DeepFM, self).__init__()

        if embedding_dims is None:
            embedding_dims = {
                'user_id': 16,
                'product_id': 16,
                'category_id': 8,
                'brand_id': 8,
            }

        if dnn_hidden_units is None:
            dnn_hidden_units = [128, 64, 32]

        self.feature_names = ['user_id', 'product_id', 'category_id', 'brand_id']
        self.num_cat_features = len(self.feature_names)
        self.num_dense_features = num_dense_features
        self.fm_k = fm_k

        # ----------------------------------------------------
        # 1. Feature Embeddings
        # ----------------------------------------------------
        self.embeddings = nn.ModuleDict()
        self.linear_embeddings = nn.ModuleDict()
        self.fm_projections = nn.ModuleDict()

        for name in self.feature_names:
            cardinality = cardinalities[name]
            emb_dim = embedding_dims[name]

            # Embedding for DNN component
            self.embeddings[name] = nn.Embedding(cardinality, emb_dim)

            # 1D Embedding for 1st-order Linear component
            self.linear_embeddings[name] = nn.Embedding(cardinality, 1)

            # Linear projection for FM 2nd-order component if emb_dim != fm_k
            if emb_dim != fm_k:
                self.fm_projections[name] = nn.Linear(emb_dim, fm_k, bias=False)
            else:
                self.fm_projections[name] = nn.Identity()

        # 1st-order linear weight for dense features
        self.dense_linear = nn.Linear(self.num_dense_features, 1, bias=True)

        # ----------------------------------------------------
        # 2. Deep Component (DNN)
        # ----------------------------------------------------
        # Dynamically compute total concatenated DNN input dimension
        self.cat_total_emb_dim = sum(embedding_dims[name] for name in self.feature_names)
        self.dnn_input_dim = self.cat_total_emb_dim + self.num_dense_features

        dnn_layers = []
        in_dim = self.dnn_input_dim

        for hidden_dim in dnn_hidden_units:
            dnn_layers.append(nn.Linear(in_dim, hidden_dim))
            dnn_layers.append(nn.ReLU())
            dnn_layers.append(nn.Dropout(p=dropout_rate))
            in_dim = hidden_dim

        dnn_layers.append(nn.Linear(in_dim, 1))
        self.dnn = nn.Sequential(*dnn_layers)

        # Initialize weights with Xavier uniform for stability
        self._init_weights()

    def _init_weights(self):
        """Initializes embeddings and linear layers using Xavier/Kaiming uniform."""
        for name in self.feature_names:
            nn.init.xavier_uniform_(self.embeddings[name].weight)
            nn.init.zeros_(self.linear_embeddings[name].weight)

        nn.init.zeros_(self.dense_linear.weight)
        nn.init.zeros_(self.dense_linear.bias)

        for m in self.dnn.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_uniform_(m.weight, nonlinearity='relu')
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x_cat: torch.Tensor, x_dense: torch.Tensor) -> torch.Tensor:
        """
        Forward pass computing Linear + FM + DNN logits.
        x_cat: (batch_size, num_cat_features)
        x_dense: (batch_size, num_dense_features)
        """
        batch_size = x_cat.size(0)

        # ----------------------------------------------------
        # 1st-Order Linear Component
        # ----------------------------------------------------
        linear_cat_out = torch.zeros(batch_size, 1, device=x_cat.device)
        for i, name in enumerate(self.feature_names):
            linear_cat_out += self.linear_embeddings[name](x_cat[:, i])

        linear_dense_out = self.dense_linear(x_dense)
        y_linear = linear_cat_out + linear_dense_out

        # ----------------------------------------------------
        # 2nd-Order Factorization Machine Component
        # ----------------------------------------------------
        fm_vectors = []
        cat_embeddings_list = []

        for i, name in enumerate(self.feature_names):
            emb = self.embeddings[name](x_cat[:, i])  # (batch_size, emb_dim)
            cat_embeddings_list.append(emb)

            fm_vec = self.fm_projections[name](emb)   # (batch_size, fm_k)
            fm_vectors.append(fm_vec)

        # Stack FM vectors: (batch_size, num_cat_features, fm_k)
        fm_stacked = torch.stack(fm_vectors, dim=1)

        # Pairwise interaction formula: 0.5 * sum((sum v)^2 - sum(v^2))
        sum_fm = torch.sum(fm_stacked, dim=1)                # (batch_size, fm_k)
        sum_sq_fm = torch.sum(fm_stacked ** 2, dim=1)          # (batch_size, fm_k)
        sq_sum_fm = sum_fm ** 2                              # (batch_size, fm_k)

        y_fm = 0.5 * torch.sum(sq_sum_fm - sum_sq_fm, dim=1, keepdim=True)  # (batch_size, 1)

        # ----------------------------------------------------
        # Deep Component (DNN)
        # ----------------------------------------------------
        # Concatenate categorical embeddings + continuous/dense features
        concat_cat = torch.cat(cat_embeddings_list, dim=1)   # (batch_size, cat_total_emb_dim)
        dnn_in = torch.cat([concat_cat, x_dense], dim=1)     # (batch_size, dnn_input_dim)

        y_dnn = self.dnn(dnn_in)                             # (batch_size, 1)

        # Combined unactivated logit
        logit = y_linear + y_fm + y_dnn
        return logit

    def predict_proba(self, x_cat: torch.Tensor, x_dense: torch.Tensor) -> torch.Tensor:
        """Returns predicted positive probability in range [0.0, 1.0]."""
        with torch.no_grad():
            logit = self.forward(x_cat, x_dense)
            return torch.sigmoid(logit)
