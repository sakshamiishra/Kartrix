import os
import json
import hashlib
import numpy as np
import torch
from sklearn.metrics import average_precision_score
from django.core.management.base import BaseCommand, CommandError

from recommendations.training.preprocessor import RecommendationDataPreprocessor, PreprocessorConfig
from recommendations.training.dataset import create_dataloaders
from recommendations.training.model import DeepFM
from recommendations.training.trainer import DeepFMTrainer, TrainerConfig, seed_everything


class Command(BaseCommand):
    help = "Evaluates the trained DeepFM recommendation model on the untouched 2,500-row test dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=256,
            help='Batch size for test DataLoader (default: 256).'
        )
        parser.add_argument(
            '--seed',
            type=int,
            default=42,
            help='Random seed for reproducibility (default: 42).'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        seed = options['seed']
        seed_everything(seed)

        self.stdout.write(self.style.NOTICE(
            f"Initializing Stage 4 Untouched Test-Set Evaluation (seed={seed}, batch_size={batch_size})..."
        ))

        # 1. Dataset MD5 Integrity Check
        config = PreprocessorConfig()
        csv_path = config.csv_path

        if not os.path.exists(csv_path):
            raise CommandError(f"Dataset CSV not found at: {csv_path}")

        with open(csv_path, 'rb') as f:
            md5_hash = hashlib.md5(f.read()).hexdigest()

        expected_md5 = "33107b34ffa8c442047e68dab8a25801"
        if md5_hash != expected_md5:
            raise CommandError(
                f"Dataset MD5 hash mismatch! Expected: {expected_md5}, Got: {md5_hash}"
            )

        self.stdout.write(self.style.SUCCESS(f"[SUCCESS] Dataset MD5 verified ({md5_hash})."))

        # 2. Check Required Stage 3 Artifacts
        data_dir = os.path.dirname(csv_path)
        checkpoint_path = os.path.join(data_dir, 'deepfm_best.pt')
        encoders_path = config.encoders_path
        scaler_path = config.scaler_path
        feature_config_path = config.feature_config_path
        eval_report_path = os.path.join(data_dir, 'test_evaluation_report.json')

        for artifact, name in [
            (checkpoint_path, "Model checkpoint (deepfm_best.pt)"),
            (encoders_path, "Encoders (encoders.pkl)"),
            (scaler_path, "Scaler (scaler.pkl)"),
            (feature_config_path, "Feature config (feature_config.json)"),
        ]:
            if not os.path.exists(artifact):
                raise CommandError(f"Required artifact missing: {name} at {artifact}")

        # 3. Preprocessing (Chronological split & transform using pre-fitted artifacts)
        try:
            preprocessor = RecommendationDataPreprocessor(config=config)
            train_tensors, val_tensors, test_tensors, feature_info = preprocessor.prepare_all()
        except Exception as e:
            raise CommandError(f"Failed to load/transform dataset: {str(e)}")

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Test dataset split reconstructed (2,500 rows)."))

        # 4. Create DataLoaders
        _, _, test_loader = create_dataloaders(
            train_tensors, val_tensors, test_tensors,
            batch_size=batch_size, seed=seed
        )

        # 5. Instantiate Model & Load Trained Checkpoint
        cardinalities = feature_info['cardinalities']
        model = DeepFM(
            cardinalities=cardinalities,
            embedding_dims={
                'user_id': 16,
                'product_id': 16,
                'category_id': 8,
                'brand_id': 8,
            },
            num_dense_features=feature_info['num_dense_features'],
            fm_k=16,
            dnn_hidden_units=[128, 64, 32],
            dropout_rate=0.3,
        )

        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        model.to(device)
        model.eval()

        self.stdout.write(self.style.SUCCESS(
            f"[SUCCESS] Trained model loaded from {checkpoint_path} (eval mode)."
        ))

        # 6. Instantiate Trainer for Standardized Evaluation
        trainer_config = TrainerConfig(
            model_save_path=checkpoint_path,
            seed=seed
        )
        trainer = DeepFMTrainer(
            model=model,
            train_loader=test_loader,
            val_loader=test_loader,
            test_loader=test_loader,
            config=trainer_config
        )

        # 7. Compute Classification & Ranking Metrics on Untouched Test Set
        test_metrics = trainer.evaluate(test_loader)
        ranking_metrics = trainer.compute_ranking_metrics(test_loader, k_list=[3, 5])

        # Compute PR-AUC (Average Precision Score)
        all_y_true = test_tensors['y'].numpy()
        all_y_prob = []

        with torch.no_grad():
            for x_cat, x_dense, _ in test_loader:
                x_cat_dev = x_cat.to(device)
                x_dense_dev = x_dense.to(device)
                probs = torch.sigmoid(model(x_cat_dev, x_dense_dev)).cpu().numpy().flatten()
                all_y_prob.extend(probs)

        pr_auc = float(average_precision_score(all_y_true, np.array(all_y_prob)))

        # 8. Consolidate Evaluation Results
        eval_report = {
            'stage': 'Stage 4 — Untouched Test-Set Evaluation',
            'dataset_md5': md5_hash,
            'test_rows': len(all_y_true),
            'positives_in_test': int((all_y_true == 1.0).sum()),
            'negatives_in_test': int((all_y_true == 0.0).sum()),
            'classification_metrics': {
                'roc_auc': test_metrics['auc'],
                'pr_auc': round(pr_auc, 4),
                'log_loss': test_metrics['log_loss'],
                'bce_loss': test_metrics['loss'],
            },
            'ranking_metrics': ranking_metrics,
            'checkpoint_path': checkpoint_path,
        }

        with open(eval_report_path, 'w', encoding='utf-8') as f:
            json.dump(eval_report, f, indent=2)

        self.stdout.write(self.style.SUCCESS("=== STAGE 4 EVALUATION RESULTS ==="))
        self.stdout.write(f"  - Test Set Rows:     {len(all_y_true)}")
        self.stdout.write(f"  - Test ROC-AUC:      {eval_report['classification_metrics']['roc_auc']}")
        self.stdout.write(f"  - Test PR-AUC:       {eval_report['classification_metrics']['pr_auc']}")
        self.stdout.write(f"  - Test Log Loss:     {eval_report['classification_metrics']['log_loss']}")
        self.stdout.write(f"  - Test BCE Loss:     {eval_report['classification_metrics']['bce_loss']}")
        self.stdout.write(f"  - Hit Rate @ 3:      {ranking_metrics.get('hit_rate_3', 0.0)}")
        self.stdout.write(f"  - NDCG @ 3:          {ranking_metrics.get('ndcg_3', 0.0)}")
        self.stdout.write(f"  - Hit Rate @ 5:      {ranking_metrics.get('hit_rate_5', 0.0)}")
        self.stdout.write(f"  - NDCG @ 5:          {ranking_metrics.get('ndcg_5', 0.0)}")
        self.stdout.write(self.style.SUCCESS(
            f"[SUCCESS] Test evaluation report saved to {eval_report_path}"
        ))
