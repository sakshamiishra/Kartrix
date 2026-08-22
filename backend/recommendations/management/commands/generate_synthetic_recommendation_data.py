from django.core.management.base import BaseCommand, CommandError
from recommendations.services import generate_synthetic_dataset


class Command(BaseCommand):
    help = "Generates a realistic synthetic interaction dataset for training the DeepFM Recommendation Engine."

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-interactions',
            type=int,
            default=25000,
            help='Number of synthetic interaction rows to generate (default: 25000).'
        )
        parser.add_argument(
            '--num-users',
            type=int,
            default=200,
            help='Number of virtual synthetic users to generate (default: 200). '
                 'These IDs exist only in the training CSV, not in the Django database.'
        )
        parser.add_argument(
            '--seed',
            type=int,
            default=42,
            help='Random seed for reproducible generation (default: 42).'
        )
        parser.add_argument(
            '--output',
            type=str,
            default=None,
            help='Custom output path for generated CSV dataset.'
        )

    def handle(self, *args, **options):
        num_interactions = options['num_interactions']
        num_users = options['num_users']
        seed = options['seed']
        output_path = options['output']

        self.stdout.write(self.style.NOTICE(
            f"Generating synthetic interaction dataset "
            f"({num_interactions} rows, {num_users} virtual users, seed={seed})..."
        ))

        try:
            stats = generate_synthetic_dataset(
                num_interactions=num_interactions,
                seed=seed,
                output_path=output_path,
                num_synthetic_users=num_users,
            )
        except ValueError as e:
            raise CommandError(f"Dataset generation failed: {str(e)}")
        except Exception as e:
            raise CommandError(f"Unexpected error during dataset generation: {str(e)}")

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Dataset generation completed successfully!"))
        self.stdout.write(f"  - Output Path: {stats['output_path']}")
        self.stdout.write(f"  - Total Rows: {stats['total_rows']}")
        self.stdout.write(f"  - Virtual Users: {stats['unique_users']}")
        self.stdout.write(f"  - Unique Products: {stats['unique_products']}")
        self.stdout.write(f"  - Unique Categories: {stats['unique_categories']}")
        self.stdout.write(f"  - Unique Brands: {stats['unique_brands']}")
        self.stdout.write(f"  - Positive Labels (1): {stats['positive_labels']} ({stats['positive_ratio'] * 100:.1f}%)")
        self.stdout.write(f"  - Negative Labels (0): {stats['negative_labels']}")
        self.stdout.write("  - Interaction Type Breakdown:")
        for itype, count in stats['interaction_distribution'].items():
            pct = count / stats['total_rows'] * 100
            self.stdout.write(f"      * {itype}: {count} ({pct:.1f}%)")
