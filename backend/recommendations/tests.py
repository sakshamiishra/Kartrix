import os
import sys
import types
import csv
import tempfile
from collections import Counter
from django.test import TestCase

# Provide backward-compatibility shim for pkg_resources if missing in python 3.14 environment
if 'pkg_resources' not in sys.modules:
    try:
        import pkg_resources
    except ModuleNotFoundError:
        dummy_pkg = types.ModuleType('pkg_resources')
        class DistributionNotFound(Exception): pass
        dummy_pkg.DistributionNotFound = DistributionNotFound
        dummy_pkg.get_distribution = lambda x: type('Dist', (), {'version': '1.0.0'})()
        sys.modules['pkg_resources'] = dummy_pkg

from products.models import Product, Category, Brand, ProductVariant
from recommendations.data.generator import SyntheticInteractionGenerator, SyntheticGeneratorConfig
from recommendations.services import generate_synthetic_dataset, get_dataset_summary


class SyntheticInteractionGeneratorTestCase(TestCase):
    """
    Unit test suite verifying dataset schema, entity validation, reproducibility,
    valid data bounds, virtual user IDs, preference differentiation, and output
    statistics for the DeepFM synthetic dataset generator.
    """

    def setUp(self):
        # Create test categories
        self.cat1, _ = Category.objects.get_or_create(slug='electronics', defaults={'name': 'Electronics'})
        self.cat2, _ = Category.objects.get_or_create(slug='audio', defaults={'name': 'Audio'})

        # Create test brands
        self.brand1, _ = Brand.objects.get_or_create(slug='sony', defaults={'name': 'Sony'})
        self.brand2, _ = Brand.objects.get_or_create(slug='apple', defaults={'name': 'Apple'})

        # Create test products and variants
        self.prod1, _ = Product.objects.get_or_create(
            slug='wireless-headphones',
            defaults={'name': 'Wireless Headphones', 'category': self.cat2, 'brand': self.brand1}
        )
        ProductVariant.objects.get_or_create(
            sku='WH-1000',
            defaults={'product': self.prod1, 'price': 4999.00, 'discount_price': 4500.00}
        )

        self.prod2, _ = Product.objects.get_or_create(
            slug='smartphone-15-pro',
            defaults={'name': 'Smartphone 15 Pro', 'category': self.cat1, 'brand': self.brand2}
        )
        ProductVariant.objects.get_or_create(
            sku='SP-15PRO',
            defaults={'product': self.prod2, 'price': 79999.00}
        )

        # Temporary CSV output file
        self.temp_dir = tempfile.mkdtemp()
        self.temp_csv = os.path.join(self.temp_dir, 'test_synthetic_data.csv')

    def tearDown(self):
        if os.path.exists(self.temp_csv):
            os.remove(self.temp_csv)
        # Clean up any extra temp files
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        if os.path.exists(self.temp_dir):
            os.rmdir(self.temp_dir)

    def test_generator_successful_output(self):
        """Verifies dataset generation produces non-empty file with exact requested row count."""
        config = SyntheticGeneratorConfig(
            num_interactions=500,
            num_synthetic_users=20,
            seed=42,
            output_path=self.temp_csv
        )
        generator = SyntheticInteractionGenerator(config=config)
        stats = generator.generate()

        self.assertTrue(os.path.exists(self.temp_csv))
        self.assertEqual(stats['total_rows'], 500)
        self.assertGreater(stats['positive_labels'], 0)
        self.assertEqual(stats['unique_users'], 20)

    def test_dataset_schema_and_columns(self):
        """Verifies expected columns including has_discount exist in generated dataset CSV."""
        generate_synthetic_dataset(
            num_interactions=50, seed=42,
            output_path=self.temp_csv, num_synthetic_users=10
        )

        expected_columns = [
            'user_id', 'product_id', 'category_id', 'brand_id',
            'price', 'has_discount', 'interaction_type', 'interaction_weight',
            'timestamp', 'label',
        ]

        with open(self.temp_csv, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            self.assertEqual(headers, expected_columns)

            rows = list(reader)
            self.assertEqual(len(rows), 50)

            valid_product_ids = set(Product.objects.values_list('id', flat=True))
            valid_category_ids = set(Category.objects.values_list('id', flat=True))
            valid_brand_ids = set(Brand.objects.values_list('id', flat=True)) | {0}

            for row in rows:
                self.assertGreater(int(row['user_id']), 1000)  # Virtual user IDs
                self.assertIn(int(row['product_id']), valid_product_ids)
                self.assertIn(int(row['category_id']), valid_category_ids)
                self.assertIn(int(row['brand_id']), valid_brand_ids)
                self.assertGreater(float(row['price']), 0)
                self.assertIn(int(row['has_discount']), [0, 1])
                self.assertIn(row['interaction_type'], [
                    'PURCHASE', 'ADD_TO_WISHLIST', 'ADD_TO_CART',
                    'PRODUCT_VIEW', 'DISMISSED'
                ])
                self.assertIn(float(row['interaction_weight']), [1.0, 0.8, 0.6, 0.2, 0.0])
                self.assertIn(int(row['label']), [0, 1])
                self.assertTrue(row['timestamp'].endswith('Z'))

    def test_virtual_user_ids_in_expected_range(self):
        """Verifies all generated user IDs are virtual and within the configured range."""
        config = SyntheticGeneratorConfig(
            num_interactions=200,
            num_synthetic_users=50,
            synthetic_user_id_start=1001,
            seed=42,
            output_path=self.temp_csv,
        )
        generator = SyntheticInteractionGenerator(config=config)
        generator.generate()

        with open(self.temp_csv, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            user_ids = set()
            for row in reader:
                uid = int(row['user_id'])
                user_ids.add(uid)
                self.assertGreaterEqual(uid, 1001)
                self.assertLess(uid, 1001 + 50)

        # With 200 interactions across 50 users, most users should appear
        self.assertGreater(len(user_ids), 30)

    def test_has_discount_column_values(self):
        """Verifies has_discount column correctly reflects product variant discount status."""
        generate_synthetic_dataset(
            num_interactions=100, seed=42,
            output_path=self.temp_csv, num_synthetic_users=10
        )

        with open(self.temp_csv, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            discount_values = set()
            for row in reader:
                discount_values.add(int(row['has_discount']))

        # prod1 has discount_price=4500, prod2 does not
        self.assertIn(0, discount_values)
        self.assertIn(1, discount_values)

    def test_reproducibility_with_same_seed(self):
        """Verifies running dataset generator twice with identical seed produces identical output."""
        temp_csv_1 = os.path.join(self.temp_dir, 'seed_test_1.csv')
        temp_csv_2 = os.path.join(self.temp_dir, 'seed_test_2.csv')

        try:
            generate_synthetic_dataset(
                num_interactions=500, seed=123,
                output_path=temp_csv_1, num_synthetic_users=30
            )
            generate_synthetic_dataset(
                num_interactions=500, seed=123,
                output_path=temp_csv_2, num_synthetic_users=30
            )

            with open(temp_csv_1, 'r', encoding='utf-8') as f1, \
                 open(temp_csv_2, 'r', encoding='utf-8') as f2:
                self.assertEqual(f1.read(), f2.read())
        finally:
            if os.path.exists(temp_csv_1):
                os.remove(temp_csv_1)
            if os.path.exists(temp_csv_2):
                os.remove(temp_csv_2)

    def test_deterministic_timestamps_independent_of_clock(self):
        """Verifies timestamps are deterministic and do not depend on wall-clock time."""
        config = SyntheticGeneratorConfig(
            num_interactions=10,
            num_synthetic_users=5,
            seed=99,
            output_path=self.temp_csv,
        )
        gen1 = SyntheticInteractionGenerator(config=config)
        gen1.generate()

        with open(self.temp_csv, 'r', encoding='utf-8') as f:
            timestamps_1 = [row['timestamp'] for row in csv.DictReader(f)]

        gen2 = SyntheticInteractionGenerator(config=config)
        gen2.generate()

        with open(self.temp_csv, 'r', encoding='utf-8') as f:
            timestamps_2 = [row['timestamp'] for row in csv.DictReader(f)]

        self.assertEqual(timestamps_1, timestamps_2)
        # Verify timestamps are within expected deterministic range (around 2026)
        for ts in timestamps_1:
            self.assertTrue(ts.startswith('2025-') or ts.startswith('2026-'))

    def test_validation_insufficient_products_fails_clearly(self):
        """Verifies generator raises ValueError when DB products are below minimum requirements."""
        Product.objects.all().delete()

        config = SyntheticGeneratorConfig(
            num_interactions=50,
            num_synthetic_users=10,
            output_path=self.temp_csv
        )
        generator = SyntheticInteractionGenerator(config=config)

        with self.assertRaises(ValueError) as ctx:
            generator.generate()

        self.assertIn("Insufficient active products", str(ctx.exception))

    def test_validation_insufficient_synthetic_users_fails(self):
        """Verifies generator raises ValueError when num_synthetic_users is below minimum."""
        config = SyntheticGeneratorConfig(
            num_interactions=50,
            num_synthetic_users=1,
            output_path=self.temp_csv
        )
        generator = SyntheticInteractionGenerator(config=config)

        with self.assertRaises(ValueError) as ctx:
            generator.generate()

        self.assertIn("num_synthetic_users must be at least 2", str(ctx.exception))

    def test_preference_differentiation_across_users(self):
        """
        Verifies that different users exhibit meaningfully different interaction patterns.
        Users with different preferred categories should have distinguishable product distributions.
        """
        config = SyntheticGeneratorConfig(
            num_interactions=2000,
            num_synthetic_users=20,
            seed=42,
            output_path=self.temp_csv,
        )
        generator = SyntheticInteractionGenerator(config=config)
        generator.generate()

        with open(self.temp_csv, mode='r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))

        # Check that product distributions vary meaningfully across users
        user_product_dists = {}
        for row in rows:
            uid = row['user_id']
            pid = row['product_id']
            if uid not in user_product_dists:
                user_product_dists[uid] = Counter()
            user_product_dists[uid][pid] += 1

        # Pick two users with sufficient interactions and compare their top product
        active_users = [uid for uid, dist in user_product_dists.items() if sum(dist.values()) >= 20]
        self.assertGreaterEqual(len(active_users), 2, "Need at least 2 active users for comparison")

        # Verify not all users have the exact same top product (would indicate no differentiation)
        top_products = [user_product_dists[uid].most_common(1)[0][0] for uid in active_users[:10]]
        unique_tops = set(top_products)
        self.assertGreater(
            len(unique_tops), 1,
            "All sampled users have identical top product — preferences are not differentiated"
        )

    def test_dataset_summary_service(self):
        """Verifies get_dataset_summary returns accurate statistical breakdown."""
        generate_synthetic_dataset(
            num_interactions=100, seed=42,
            output_path=self.temp_csv, num_synthetic_users=15
        )
        summary = get_dataset_summary(self.temp_csv)

        self.assertEqual(summary['total_rows'], 100)
        self.assertGreater(summary['unique_users_count'], 0)
        self.assertGreater(summary['unique_products_count'], 0)
        self.assertGreater(summary['unique_categories_count'], 0)
        self.assertGreater(summary['unique_brands_count'], 0)
        self.assertGreater(summary['positive_labels'] + summary['negative_labels'], 0)
        self.assertEqual(len(summary['sample_rows']), 5)
        # Verify has_discount is in sample rows
        self.assertIn('has_discount', summary['sample_rows'][0])


class DeepFMTrainingPipelineTestCase(TestCase):
    """
    Unit tests for DeepFM training pipeline: preprocessor, dataset, model, and trainer.
    """

    def setUp(self):
        self.cat1, _ = Category.objects.get_or_create(slug='electronics', defaults={'name': 'Electronics'})
        self.cat2, _ = Category.objects.get_or_create(slug='audio', defaults={'name': 'Audio'})
        self.brand1, _ = Brand.objects.get_or_create(slug='sony', defaults={'name': 'Sony'})
        self.brand2, _ = Brand.objects.get_or_create(slug='apple', defaults={'name': 'Apple'})

        self.prod1, _ = Product.objects.get_or_create(
            slug='headphones',
            defaults={'name': 'Headphones', 'category': self.cat2, 'brand': self.brand1}
        )
        ProductVariant.objects.get_or_create(
            sku='HP-1',
            defaults={'product': self.prod1, 'price': 4999.00}
        )

        self.prod2, _ = Product.objects.get_or_create(
            slug='phone',
            defaults={'name': 'Phone', 'category': self.cat1, 'brand': self.brand2}
        )
        ProductVariant.objects.get_or_create(
            sku='PH-1',
            defaults={'product': self.prod2, 'price': 50000.00, 'discount_price': 45000.00}
        )

        self.temp_dir = tempfile.mkdtemp()
        self.temp_csv = os.path.join(self.temp_dir, 'pipeline_test_data.csv')
        self.encoders_path = os.path.join(self.temp_dir, 'encoders.pkl')
        self.scaler_path = os.path.join(self.temp_dir, 'scaler.pkl')
        self.config_path = os.path.join(self.temp_dir, 'feature_config.json')
        self.model_path = os.path.join(self.temp_dir, 'deepfm_best.pt')
        self.report_path = os.path.join(self.temp_dir, 'training_report.json')

        # Generate small dataset for testing
        generate_synthetic_dataset(
            num_interactions=300,
            seed=42,
            output_path=self.temp_csv,
            num_synthetic_users=10
        )

    def tearDown(self):
        for f in [self.temp_csv, self.encoders_path, self.scaler_path, self.config_path, self.model_path, self.report_path]:
            if os.path.exists(f):
                os.remove(f)
        if os.path.exists(self.temp_dir):
            os.rmdir(self.temp_dir)

    def test_preprocessor_temporal_split_and_tensors(self):
        """Verifies preprocessor performs 80/10/10 temporal split and outputs correct tensor shapes."""
        from recommendations.training.preprocessor import RecommendationDataPreprocessor, PreprocessorConfig

        config = PreprocessorConfig(
            csv_path=self.temp_csv,
            encoders_path=self.encoders_path,
            scaler_path=self.scaler_path,
            feature_config_path=self.config_path
        )
        preprocessor = RecommendationDataPreprocessor(config=config)
        train_t, val_t, test_t, info = preprocessor.prepare_all()

        self.assertEqual(info['train_size'], 240)
        self.assertEqual(info['val_size'], 30)
        self.assertEqual(info['test_size'], 30)

        # Check tensor shapes
        self.assertEqual(train_t['x_cat'].shape, (240, 4))
        self.assertEqual(train_t['x_dense'].shape, (240, 2))
        self.assertEqual(train_t['y'].shape, (240,))

        # Verify artifacts saved
        self.assertTrue(os.path.exists(self.encoders_path))
        self.assertTrue(os.path.exists(self.scaler_path))
        self.assertTrue(os.path.exists(self.config_path))

    def test_deepfm_model_forward_pass_and_proba(self):
        """Verifies DeepFM model forward pass shape (N, 1) and predict_proba range [0, 1]."""
        import torch
        from recommendations.training.model import DeepFM

        cardinalities = {'user_id': 15, 'product_id': 5, 'category_id': 3, 'brand_id': 3}
        model = DeepFM(
            cardinalities=cardinalities,
            embedding_dims={'user_id': 16, 'product_id': 16, 'category_id': 8, 'brand_id': 8},
            num_dense_features=2
        )

        # Verify dynamic DNN input dim: (16+16+8+8) + 2 = 50
        self.assertEqual(model.dnn_input_dim, 50)

        dummy_x_cat = torch.tensor([[1, 2, 0, 1], [0, 1, 1, 0]], dtype=torch.long)
        dummy_x_dense = torch.tensor([[0.5, 1.0], [-0.2, 0.0]], dtype=torch.float32)

        logits = model(dummy_x_cat, dummy_x_dense)
        self.assertEqual(logits.shape, (2, 1))

        probs = model.predict_proba(dummy_x_cat, dummy_x_dense)
        self.assertEqual(probs.shape, (2, 1))
        self.assertTrue(torch.all(probs >= 0.0) and torch.all(probs <= 1.0))

    def test_trainer_dry_run_fit(self):
        """Verifies trainer runs 1-epoch dry-run cleanly and generates output artifacts."""
        from recommendations.training.preprocessor import RecommendationDataPreprocessor, PreprocessorConfig
        from recommendations.training.dataset import create_dataloaders
        from recommendations.training.model import DeepFM
        from recommendations.training.trainer import DeepFMTrainer, TrainerConfig

        prep_config = PreprocessorConfig(
            csv_path=self.temp_csv,
            encoders_path=self.encoders_path,
            scaler_path=self.scaler_path,
            feature_config_path=self.config_path
        )
        preprocessor = RecommendationDataPreprocessor(config=prep_config)
        train_t, val_t, test_t, info = preprocessor.prepare_all()

        train_loader, val_loader, test_loader = create_dataloaders(
            train_t, val_t, test_t, batch_size=32, seed=42
        )

        model = DeepFM(cardinalities=info['cardinalities'], num_dense_features=info['num_dense_features'])
        trainer_config = TrainerConfig(
            model_save_path=self.model_path,
            report_save_path=self.report_path,
            max_epochs=1,
            seed=42
        )

        trainer = DeepFMTrainer(
            model=model,
            train_loader=train_loader,
            val_loader=val_loader,
            test_loader=test_loader,
            config=trainer_config,
            pos_weight=0.5
        )

        report = trainer.fit()

        self.assertEqual(len(report['history']), 1)
        self.assertIn('best_val_auc', report)
        self.assertIn('test_metrics', report)
        self.assertTrue(os.path.exists(self.model_path))
        self.assertTrue(os.path.exists(self.report_path))


class DeepFMInferenceTestCase(TestCase):
    """
    Unit test suite for Phase 11 Stage 5 DeepFM Inference Integration.
    Covers artifact loading, known user personalized ranking, batch scoring,
    score-based ordering, cold-start/anonymous fallbacks, missing artifact fallbacks,
    exception handling, API endpoints, parameter validation, and immutability guarantees.
    """

    def setUp(self):
        from accounts.models import User
        self.User = User

        # Create test categories
        self.cat1, _ = Category.objects.get_or_create(slug='electronics', defaults={'name': 'Electronics'})
        self.cat2, _ = Category.objects.get_or_create(slug='audio', defaults={'name': 'Audio'})

        # Create test brands
        self.brand1, _ = Brand.objects.get_or_create(slug='sony', defaults={'name': 'Sony'})
        self.brand2, _ = Brand.objects.get_or_create(slug='apple', defaults={'name': 'Apple'})

        # Create test products & active variants
        self.prod1, _ = Product.objects.get_or_create(
            slug='test-headphones-infer',
            defaults={'name': 'Test Headphones Infer', 'category': self.cat2, 'brand': self.brand1, 'is_active': True}
        )
        ProductVariant.objects.get_or_create(
            sku='TEST-HP-INF-01',
            defaults={'product': self.prod1, 'price': 5000.00, 'discount_price': 4500.00, 'is_active': True}
        )

        self.prod2, _ = Product.objects.get_or_create(
            slug='test-phone-infer',
            defaults={'name': 'Test Phone Infer', 'category': self.cat1, 'brand': self.brand2, 'is_active': True}
        )
        ProductVariant.objects.get_or_create(
            sku='TEST-PH-INF-01',
            defaults={'product': self.prod2, 'price': 50000.00, 'is_active': True}
        )

        # Create a known user matching Stage 3 training user_id (e.g. ID 1001)
        self.known_user, _ = User.objects.get_or_create(
            pk=1001,
            defaults={'email': 'user1001@example.com', 'is_active': True}
        )

        # Create a brand new cold-start user (ID 99999)
        self.cold_user, _ = User.objects.get_or_create(
            pk=99999,
            defaults={'email': 'colduser99999@example.com', 'is_active': True}
        )

    def test_1_deepfm_inference_engine_loads(self):
        """Verifies DeepFMInferenceEngine loads trained model & Stage 3 artifacts."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        engine = DeepFMInferenceEngine.get_instance()
        loaded = engine.load_artifacts()
        self.assertTrue(loaded)
        self.assertIsNotNone(engine.model)
        self.assertIsNotNone(engine.encoders)
        self.assertIsNotNone(engine.scaler)
        self.assertIsNotNone(engine.feature_config)

    def test_2_valid_known_user_receives_deepfm_ranked_candidates(self):
        """Verifies valid known user receives personalized recommendations."""
        from recommendations.services import get_recommendations
        result = get_recommendations(user=self.known_user, limit=5)
        self.assertEqual(result['recommendation_type'], 'DEEPFM_PERSONALIZED')
        self.assertGreater(result['count'], 0)
        self.assertIn(self.prod1, result['products'])

    def test_3_multiple_candidates_scored_in_batch(self):
        """Verifies score_candidates processes multiple products in a single batch."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        engine = DeepFMInferenceEngine.get_instance()
        candidates = [self.prod1, self.prod2]
        scored = engine.score_candidates(self.known_user, candidates)
        self.assertEqual(len(scored), 2)
        for prod, score in scored:
            self.assertIsInstance(prod, Product)
            self.assertIsInstance(score, float)
            self.assertTrue(0.0 <= score <= 1.0)

    def test_4_ranking_is_based_on_model_score(self):
        """Verifies returned scored candidates are ordered descending by score."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        engine = DeepFMInferenceEngine.get_instance()
        candidates = [self.prod1, self.prod2]
        scored = engine.score_candidates(self.known_user, candidates)
        if len(scored) >= 2:
            self.assertGreaterEqual(scored[0][1], scored[1][1])

    def test_5_anonymous_user_uses_basic_fallback(self):
        """Verifies anonymous user receives basic fallback recommendations."""
        from recommendations.services import get_recommendations
        result = get_recommendations(user=None, limit=5)
        self.assertEqual(result['recommendation_type'], 'BASIC_FALLBACK')
        self.assertGreater(result['count'], 0)

    def test_6_unknown_new_user_uses_basic_fallback(self):
        """Verifies unrepresented cold-start user receives basic fallback."""
        from recommendations.services import get_recommendations
        result = get_recommendations(user=self.cold_user, limit=5)
        self.assertEqual(result['recommendation_type'], 'BASIC_FALLBACK')
        self.assertGreater(result['count'], 0)

    def test_7_missing_checkpoint_uses_fallback(self):
        """Verifies missing checkpoint triggers fallback to basic recommendation engine."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        from recommendations.services import get_recommendations

        bad_engine = DeepFMInferenceEngine(data_dir=tempfile.mkdtemp())
        DeepFMInferenceEngine._instance = bad_engine

        try:
            result = get_recommendations(user=self.known_user, limit=5)
            self.assertEqual(result['recommendation_type'], 'BASIC_FALLBACK')
        finally:
            DeepFMInferenceEngine._instance = None

    def test_8_missing_preprocessing_artifact_uses_fallback(self):
        """Verifies missing encoders/scalers trigger basic recommendation fallback."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        engine = DeepFMInferenceEngine.get_instance()
        saved_encoders_path = engine.encoders_path
        saved_loaded = engine._is_loaded

        engine.encoders_path = "/nonexistent/encoders.pkl"
        engine._is_loaded = False

        try:
            from recommendations.services import get_recommendations
            result = get_recommendations(user=self.known_user, limit=5)
            self.assertEqual(result['recommendation_type'], 'BASIC_FALLBACK')
        finally:
            engine.encoders_path = saved_encoders_path
            engine._is_loaded = saved_loaded
            engine.load_artifacts()

    def test_9_inference_exception_uses_fallback(self):
        """Verifies runtime exception during scoring falls back gracefully without raising."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        from recommendations.services import get_recommendations

        engine = DeepFMInferenceEngine.get_instance()
        engine.load_artifacts()

        def broken_score(user, candidates):
            raise RuntimeError("Simulated GPU/CPU Out of Memory")

        original_score = engine.score_candidates
        engine.score_candidates = broken_score

        try:
            result = get_recommendations(user=self.known_user, limit=5)
            self.assertEqual(result['recommendation_type'], 'BASIC_FALLBACK')
        finally:
            engine.score_candidates = original_score

    def test_10_existing_basic_recommendation_logic_still_works(self):
        """Verifies get_basic_recommendations returns active products correctly."""
        from recommendations.services import get_basic_recommendations
        products = get_basic_recommendations(limit=5)
        self.assertIsInstance(products, list)
        self.assertTrue(len(products) > 0)
        self.assertTrue(all(p.is_active for p in products))

    def test_11_api_endpoint_authenticated_user(self):
        """Verifies GET /api/recommendations/ with authenticated user returns status 200."""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.known_user)
        response = client.get('/api/recommendations/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('recommendation_type', data)
        self.assertIn('results', data)
        self.assertIn('count', data)

    def test_12_api_endpoint_anonymous_user(self):
        """Verifies GET /api/recommendations/ with anonymous user returns status 200 and BASIC_FALLBACK."""
        from rest_framework.test import APIClient
        client = APIClient()
        response = client.get('/api/recommendations/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['recommendation_type'], 'BASIC_FALLBACK')
        self.assertIsInstance(data['results'], list)

    def test_13_invalid_parameters_handled_safely(self):
        """Verifies GET /api/recommendations/ returns HTTP 400 for invalid query parameters."""
        from rest_framework.test import APIClient
        client = APIClient()
        resp1 = client.get('/api/recommendations/?limit=-5')
        self.assertEqual(resp1.status_code, 400)

        resp2 = client.get('/api/recommendations/?limit=abc')
        self.assertEqual(resp2.status_code, 400)

        resp3 = client.get('/api/recommendations/?category_id=xyz')
        self.assertEqual(resp3.status_code, 400)

    def test_14_no_training_or_refitting_occurs_during_inference(self):
        """Verifies encoders and scaler remain unmodified during inference operations."""
        from recommendations.inference.engine import DeepFMInferenceEngine
        engine = DeepFMInferenceEngine.get_instance()
        engine.load_artifacts()

        initial_user_classes = list(engine.encoders['user_id'].classes_)
        candidates = [self.prod1, self.prod2]
        engine.score_candidates(self.known_user, candidates)

        post_user_classes = list(engine.encoders['user_id'].classes_)
        self.assertEqual(initial_user_classes, post_user_classes)
