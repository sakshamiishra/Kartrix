import os
import json
from django.core.management.base import BaseCommand, CommandError

from recommendations.training.preprocessor import RecommendationDataPreprocessor, PreprocessorConfig
from recommendations.training.dataset import create_dataloaders
from recommendations.training.model import DeepFM
from recommendations.training.trainer import DeepFMTrainer, TrainerConfig, seed_everything


class Command(BaseCommand):
    help = "Trains or verifies the DeepFM Recommendation Engine pipeline."

    def add_arguments(self, parser):
        parser.add_argument(
            '--epochs',
            type=int,
            default=50,
            help='Maximum number of training epochs (default: 50).'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=512,
            help='Batch size for DataLoaders (default: 512).'
        )
        parser.add_argument(
            '--lr',
            type=float,
            default=1e-3,
            help='Initial learning rate for Adam (default: 0.001).'
        )
        parser.add_argument(
            '--seed',
            type=int,
            default=42,
            help='Random seed for reproducibility (default: 42).'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Runs pipeline initialization and 1-epoch smoke test without running full training.'
        )

    def handle(self, *args, **options):
        epochs = options['epochs']
        batch_size = options['batch_size']
        lr = options['lr']
        seed = options['seed']
        dry_run = options['dry_run']

        seed_everything(seed)

        self.stdout.write(self.style.NOTICE(
            f"Initializing DeepFM training pipeline (seed={seed}, batch_size={batch_size}, lr={lr})..."
        ))

        # 1. Preprocessing
        try:
            preprocessor = RecommendationDataPreprocessor(
                config=PreprocessorConfig()
            )
            train_tensors, val_tensors, test_tensors, feature_info = preprocessor.prepare_all()
        except Exception as e:
            raise CommandError(f"Preprocessing failed: {str(e)}")

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Data preprocessing completed."))
        self.stdout.write(f"  - Train Split: {feature_info['train_size']} rows (80%)")
        self.stdout.write(f"  - Val Split:   {feature_info['val_size']} rows (10%)")
        self.stdout.write(f"  - Test Split:  {feature_info['test_size']} rows (10%)")

        # 2. DataLoaders
        train_loader, val_loader, test_loader = create_dataloaders(
            train_tensors, val_tensors, test_tensors,
            batch_size=batch_size, seed=seed
        )

        # 3. Calculate pos_weight for class imbalance
        y_train = train_tensors['y'].numpy()
        pos_count = (y_train == 1.0).sum()
        neg_count = (y_train == 0.0).sum()
        pos_weight = float(neg_count / max(pos_count, 1))

        self.stdout.write(f"  - Positive labels in train: {pos_count} ({pos_count/len(y_train)*100:.1f}%)")
        self.stdout.write(f"  - Negative labels in train: {neg_count} ({neg_count/len(y_train)*100:.1f}%)")
        self.stdout.write(f"  - Calculated BCEWithLogitsLoss pos_weight: {pos_weight:.4f}")

        # 4. Model Initialization
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

        self.stdout.write(self.style.SUCCESS(
            f"[SUCCESS] DeepFM Model initialized (DNN Input Dim: {model.dnn_input_dim}, "
            f"Total Params: {sum(p.numel() for p in model.parameters())})."
        ))

        # 5. Trainer Setup
        trainer_config = TrainerConfig(
            max_epochs=1 if dry_run else epochs,
            learning_rate=lr,
            seed=seed
        )
        trainer = DeepFMTrainer(
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            test_loader=test_loader,
            config=trainer_config,
            pos_weight=pos_weight
        )

        if dry_run:
            self.stdout.write(self.style.NOTICE("Executing 1-epoch dry-run verification..."))
            report = trainer.fit()
            self.stdout.write(self.style.SUCCESS("[SUCCESS] Dry-run smoke test completed cleanly!"))
            self.stdout.write(f"  - Val Loss: {report['history'][0]['val_loss']}")
            self.stdout.write(f"  - Val AUC:  {report['history'][0]['val_auc']}")
            self.stdout.write(f"  - Artifacts serialized to data/ directory.")
            return

        self.stdout.write(self.style.NOTICE(f"Starting full training pipeline ({epochs} max epochs)..."))
        report = trainer.fit()

        self.stdout.write(self.style.SUCCESS("[SUCCESS] DeepFM Training completed successfully!"))
        self.stdout.write(f"  - Best Epoch: {report['best_epoch']}")
        self.stdout.write(f"  - Best Val AUC: {report['best_val_auc']}")
        self.stdout.write(f"  - Test ROC-AUC: {report['test_metrics']['auc']}")
        self.stdout.write(f"  - Test LogLoss: {report['test_metrics']['log_loss']}")
        self.stdout.write(f"  - Test Hit Rate @ 5: {report['ranking_metrics'].get('hit_rate_5', 0.0)}")
        self.stdout.write(f"  - Test NDCG @ 5: {report['ranking_metrics'].get('ndcg_5', 0.0)}")
