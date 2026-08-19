import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from products.models import (
    Category,
    Brand,
    Product,
    ProductImage,
    ProductAttribute,
    AttributeValue,
    ProductVariant,
    Inventory,
    InventoryTransaction,
)


class Command(BaseCommand):
    help = 'Idempotently seed realistic development/demo product catalog data (prices in INR)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Starting EasyKart Demo Catalog Seeding (INR Prices)...'))

        # Ensure media directory exists
        media_products_dir = os.path.join(settings.MEDIA_ROOT, 'products')
        os.makedirs(media_products_dir, exist_ok=True)

        # 1. Categories
        categories_data = [
            {'name': 'Laptops', 'slug': 'laptops', 'description': 'High performance notebooks and ultrabooks for work and creativity.'},
            {'name': 'Mobile Phones', 'slug': 'mobile-phones', 'description': 'Flagship smartphones, iOS and Android devices.'},
            {'name': 'Watches', 'slug': 'watches', 'description': 'Classic digital, analog, and smart wearable timepieces.'},
            {'name': 'Footwear', 'slug': 'footwear', 'description': 'Athletic sneakers, running shoes, and lifestyle footwear.'},
            {'name': 'Clothing', 'slug': 'clothing', 'description': 'Premium outerwear, casual apparel, and activewear.'},
            {'name': 'Electronics', 'slug': 'electronics', 'description': 'Audio gear, computer peripherals, and smart devices.'},
            {'name': 'Accessories', 'slug': 'accessories', 'description': 'Bags, sunglasses, straps, and everyday carries.'},
        ]

        categories_dict = {}
        for cat_info in categories_data:
            cat, created = Category.objects.get_or_create(
                slug=cat_info['slug'],
                defaults={
                    'name': cat_info['name'],
                    'description': cat_info['description'],
                    'is_active': True,
                }
            )
            categories_dict[cat_info['slug']] = cat

        self.stdout.write(self.style.SUCCESS(f'Processed {len(categories_dict)} categories.'))

        # 2. Brands
        brands_data = [
            {'name': 'Apple', 'slug': 'apple', 'description': 'Innovative hardware, software, and services.'},
            {'name': 'Samsung', 'slug': 'samsung', 'description': 'Global technology leader in electronics and mobile devices.'},
            {'name': 'Casio', 'slug': 'casio', 'description': 'Legendary Japanese watchmaker known for durability and precision.'},
            {'name': 'Nike', 'slug': 'nike', 'description': 'World-leading athletic footwear, apparel, and equipment.'},
            {'name': 'Logitech', 'slug': 'logitech', 'description': 'Premium computer peripherals and productivity gear.'},
            {'name': 'Ray-Ban', 'slug': 'ray-ban', 'description': 'Iconic luxury sunglasses and eyewear.'},
        ]

        brands_dict = {}
        for b_info in brands_data:
            brand, created = Brand.objects.get_or_create(
                slug=b_info['slug'],
                defaults={
                    'name': b_info['name'],
                    'description': b_info['description'],
                    'is_active': True,
                }
            )
            brands_dict[b_info['slug']] = brand

        self.stdout.write(self.style.SUCCESS(f'Processed {len(brands_dict)} brands.'))

        # 3. Attributes & AttributeValues
        attr_storage, _ = ProductAttribute.objects.get_or_create(name='Storage')
        attr_ram, _ = ProductAttribute.objects.get_or_create(name='RAM')
        attr_color, _ = ProductAttribute.objects.get_or_create(name='Color')
        attr_size, _ = ProductAttribute.objects.get_or_create(name='Size')

        def get_attr_value(attr_obj, val):
            av, _ = AttributeValue.objects.get_or_create(attribute=attr_obj, value=str(val))
            return av

        # 4. Products, Variants & Inventory (Prices in INR numeric values)
        products_catalog = [
            {
                'name': 'MacBook Air 15" M3',
                'slug': 'macbook-air-15-m3',
                'sku': 'PROD-MACBOOK-AIR-15',
                'category_slug': 'laptops',
                'brand_slug': 'apple',
                'description': 'Ultra-thin 15-inch laptop with Apple M3 chip, Liquid Retina display, and up to 18 hours of battery life.',
                'bg_color': '#2C3E50',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'MBA-15-M3-8-256-GY', 'price': '134900.00', 'discount': '124900.00', 'stock': 25, 'attrs': [(attr_ram, '8GB'), (attr_storage, '256GB'), (attr_color, 'Space Gray')]},
                    {'sku': 'MBA-15-M3-16-512-MN', 'price': '154900.00', 'discount': '144900.00', 'stock': 20, 'attrs': [(attr_ram, '16GB'), (attr_storage, '512GB'), (attr_color, 'Midnight')]},
                    {'sku': 'MBA-15-M3-16-512-ST', 'price': '154900.00', 'discount': None, 'stock': 15, 'attrs': [(attr_ram, '16GB'), (attr_storage, '512GB'), (attr_color, 'Starlight')]},
                ]
            },
            {
                'name': 'MacBook Pro 16" M3 Max',
                'slug': 'macbook-pro-16-m3max',
                'sku': 'PROD-MACBOOK-PRO-16',
                'category_slug': 'laptops',
                'brand_slug': 'apple',
                'description': 'Professional workstation notebook featuring M3 Max 16-core CPU, 40-core GPU, and Liquid Retina XDR display.',
                'bg_color': '#111111',
                'text_color': '#F5F5F7',
                'variants': [
                    {'sku': 'MBP-16-M3MAX-36-1TB-SB', 'price': '399900.00', 'discount': '349900.00', 'stock': 12, 'attrs': [(attr_ram, '36GB'), (attr_storage, '1TB'), (attr_color, 'Space Black')]},
                    {'sku': 'MBP-16-M3MAX-48-1TB-SV', 'price': '449900.00', 'discount': None, 'stock': 10, 'attrs': [(attr_ram, '48GB'), (attr_storage, '1TB'), (attr_color, 'Silver')]},
                ]
            },
            {
                'name': 'iPhone 16 Pro',
                'slug': 'iphone-16-pro',
                'sku': 'PROD-IPHONE-16-PRO',
                'category_slug': 'mobile-phones',
                'brand_slug': 'apple',
                'description': 'Grade-5 titanium design with A18 Pro chip, 48MP Fusion camera system, 4K 120 fps Dolby Vision video, and Camera Control.',
                'bg_color': '#5F5C58',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'IP16PRO-128-NT', 'price': '119900.00', 'discount': None, 'stock': 30, 'attrs': [(attr_storage, '128GB'), (attr_color, 'Natural Titanium')]},
                    {'sku': 'IP16PRO-256-DT', 'price': '129900.00', 'discount': '124900.00', 'stock': 25, 'attrs': [(attr_storage, '256GB'), (attr_color, 'Desert Titanium')]},
                    {'sku': 'IP16PRO-512-BT', 'price': '149900.00', 'discount': None, 'stock': 15, 'attrs': [(attr_storage, '512GB'), (attr_color, 'Black Titanium')]},
                ]
            },
            {
                'name': 'iPhone 15',
                'slug': 'iphone-15',
                'sku': 'PROD-IPHONE-15',
                'category_slug': 'mobile-phones',
                'brand_slug': 'apple',
                'description': 'Dynamic Island, 48MP Main camera, 2x Telephoto lens, USB-C connector, and durable color-infused back glass.',
                'bg_color': '#2D4059',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'IP15-128-BLU', 'price': '79900.00', 'discount': '69900.00', 'stock': 40, 'attrs': [(attr_storage, '128GB'), (attr_color, 'Blue')]},
                    {'sku': 'IP15-256-BLK', 'price': '89900.00', 'discount': '79900.00', 'stock': 35, 'attrs': [(attr_storage, '256GB'), (attr_color, 'Black')]},
                ]
            },
            {
                'name': 'Samsung Galaxy S24 Ultra',
                'slug': 'galaxy-s24-ultra',
                'sku': 'PROD-GALAXY-S24-ULTRA',
                'category_slug': 'mobile-phones',
                'brand_slug': 'samsung',
                'description': 'Titanium armor frame, Galaxy AI live translate, 200MP camera, Snapdragon 8 Gen 3 processor, and built-in S Pen.',
                'bg_color': '#4A4E69',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'S24U-256-GY', 'price': '134999.00', 'discount': '119999.00', 'stock': 25, 'attrs': [(attr_storage, '256GB'), (attr_color, 'Titanium Gray')]},
                    {'sku': 'S24U-512-BK', 'price': '144999.00', 'discount': None, 'stock': 18, 'attrs': [(attr_storage, '512GB'), (attr_color, 'Titanium Black')]},
                ]
            },
            {
                'name': 'Casio F-91W Classic Digital Watch',
                'slug': 'casio-f91w',
                'sku': 'PROD-CASIO-F91W',
                'category_slug': 'watches',
                'brand_slug': 'casio',
                'description': 'Iconic, ultra-reliable digital timepiece with daily alarm, 1/100s precision stopwatch, and 7-year long battery life.',
                'bg_color': '#1B263B',
                'text_color': '#F56A00',
                'variants': [
                    {'sku': 'F91W-1-BLK', 'price': '1295.00', 'discount': None, 'stock': 100, 'attrs': [(attr_color, 'Black Resin')]},
                    {'sku': 'F91WG-9-GLD', 'price': '1695.00', 'discount': '1495.00', 'stock': 60, 'attrs': [(attr_color, 'Gold Frame')]},
                ]
            },
            {
                'name': 'Casio A168WA Vintage Digital Watch',
                'slug': 'casio-a168wa',
                'sku': 'PROD-CASIO-A168WA',
                'category_slug': 'watches',
                'brand_slug': 'casio',
                'description': 'Retro stainless steel bracelet watch with ElectroLuminescence backlight, 1/100s stopwatch, and water resistance.',
                'bg_color': '#708090',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'A168WA-1-SLV', 'price': '2495.00', 'discount': None, 'stock': 45, 'attrs': [(attr_color, 'Silver Steel')]},
                    {'sku': 'A168WG-9-GLD', 'price': '3995.00', 'discount': '3495.00', 'stock': 30, 'attrs': [(attr_color, 'Gold Steel')]},
                ]
            },
            {
                'name': 'Casio G-Shock GA-2100 "CasiOak"',
                'slug': 'casio-ga2100',
                'sku': 'PROD-CASIO-GA2100',
                'category_slug': 'watches',
                'brand_slug': 'casio',
                'description': 'Octagonal bezel tough watch with carbon core guard structure, 200m water resistance, and double LED light.',
                'bg_color': '#222222',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'GA2100-1A-BLK', 'price': '9995.00', 'discount': None, 'stock': 50, 'attrs': [(attr_color, 'All Black')]},
                    {'sku': 'GA2100-4A-RED', 'price': '9995.00', 'discount': '8995.00', 'stock': 35, 'attrs': [(attr_color, 'Red Accent')]},
                ]
            },
            {
                'name': 'Nike Air Max 270',
                'slug': 'nike-air-max-270',
                'sku': 'PROD-NIKE-AM270',
                'category_slug': 'footwear',
                'brand_slug': 'nike',
                'description': "Nike's first lifestyle Air Max shoe with the biggest heel Air unit yet for super-soft cushioning and modern style.",
                'bg_color': '#F56A00',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'AM270-BLK-9', 'price': '14995.00', 'discount': '12995.00', 'stock': 30, 'attrs': [(attr_color, 'Black/White'), (attr_size, 'Size 9')]},
                    {'sku': 'AM270-BLK-10', 'price': '14995.00', 'discount': '12995.00', 'stock': 35, 'attrs': [(attr_color, 'Black/White'), (attr_size, 'Size 10')]},
                    {'sku': 'AM270-BLK-11', 'price': '14995.00', 'discount': '12995.00', 'stock': 20, 'attrs': [(attr_color, 'Black/White'), (attr_size, 'Size 11')]},
                ]
            },
            {
                'name': 'Nike Air Force 1 \'07',
                'slug': 'nike-af1-07',
                'sku': 'PROD-NIKE-AF1',
                'category_slug': 'footwear',
                'brand_slug': 'nike',
                'description': 'The radiance lives on in the Nike Air Force 1 \'07, the basketball icon that puts a fresh spin on crisp leather and Air cushioning.',
                'bg_color': '#E0E0E0',
                'text_color': '#111111',
                'variants': [
                    {'sku': 'AF1-WHT-95', 'price': '9695.00', 'discount': None, 'stock': 50, 'attrs': [(attr_color, 'Triple White'), (attr_size, 'Size 9.5')]},
                    {'sku': 'AF1-WHT-10', 'price': '9695.00', 'discount': None, 'stock': 45, 'attrs': [(attr_color, 'Triple White'), (attr_size, 'Size 10')]},
                ]
            },
            {
                'name': 'Logitech MX Master 3S Wireless Mouse',
                'slug': 'logitech-mx-master-3s',
                'sku': 'PROD-LOGI-MX3S',
                'category_slug': 'electronics',
                'brand_slug': 'logitech',
                'description': 'Ergonomic performance mouse with 8,000 DPI track-on-glass sensor, Quiet Clicks, and MagSpeed electromagnetic scrolling.',
                'bg_color': '#333333',
                'text_color': '#00E676',
                'variants': [
                    {'sku': 'MX3S-GRAP', 'price': '10995.00', 'discount': None, 'stock': 40, 'attrs': [(attr_color, 'Graphite')]},
                    {'sku': 'MX3S-GRAY', 'price': '10995.00', 'discount': '9495.00', 'stock': 25, 'attrs': [(attr_color, 'Pale Gray')]},
                ]
            },
            {
                'name': 'Logitech MX Keys S Wireless Keyboard',
                'slug': 'logitech-mx-keys-s',
                'sku': 'PROD-LOGI-MXKEYS-S',
                'category_slug': 'electronics',
                'brand_slug': 'logitech',
                'description': 'Low-profile wireless illuminated keyboard with spherically-dished keys, smart illumination, and customizable Smart Actions.',
                'bg_color': '#212121',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'MXKEYS-S-GRAP', 'price': '11995.00', 'discount': None, 'stock': 35, 'attrs': [(attr_color, 'Graphite')]},
                ]
            },
            {
                'name': 'Ray-Ban Classic Wayfarer Sunglasses',
                'slug': 'rayban-wayfarer-rb2140',
                'sku': 'PROD-RAYBAN-RB2140',
                'category_slug': 'accessories',
                'brand_slug': 'ray-ban',
                'description': 'The most recognizable style in sunglasses history since 1952. Features acetate frame and G-15 crystal glass lenses.',
                'bg_color': '#111111',
                'text_color': '#F56A00',
                'variants': [
                    {'sku': 'RB2140-BLK-G15', 'price': '12590.00', 'discount': '11290.00', 'stock': 30, 'attrs': [(attr_color, 'Black / G-15 Lens')]},
                    {'sku': 'RB2140-TOR-BRN', 'price': '12590.00', 'discount': None, 'stock': 20, 'attrs': [(attr_color, 'Tortoise / Brown Lens')]},
                ]
            },
            {
                'name': 'Nike Tech Fleece Full-Zip Hoodie',
                'slug': 'nike-tech-fleece-hoodie',
                'sku': 'PROD-NIKE-TECH-FLEECE',
                'category_slug': 'clothing',
                'brand_slug': 'nike',
                'description': 'Premium, lightweight fleece hoodie—smooth on both sides—offering maximum warmth without adding unnecessary bulk.',
                'bg_color': '#808080',
                'text_color': '#FFFFFF',
                'variants': [
                    {'sku': 'NTF-GY-M', 'price': '9995.00', 'discount': None, 'stock': 25, 'attrs': [(attr_color, 'Heather Gray'), (attr_size, 'Medium')]},
                    {'sku': 'NTF-GY-L', 'price': '9995.00', 'discount': None, 'stock': 20, 'attrs': [(attr_color, 'Heather Gray'), (attr_size, 'Large')]},
                    {'sku': 'NTF-BK-M', 'price': '9995.00', 'discount': '8495.00', 'stock': 15, 'attrs': [(attr_color, 'Black'), (attr_size, 'Medium')]},
                ]
            },
        ]

        products_created = 0
        variants_updated = 0

        for p_data in products_catalog:
            category = categories_dict[p_data['category_slug']]
            brand = brands_dict.get(p_data['brand_slug'])

            product, created = Product.objects.get_or_create(
                slug=p_data['slug'],
                defaults={
                    'category': category,
                    'brand': brand,
                    'name': p_data['name'],
                    'sku': p_data['sku'],
                    'description': p_data['description'],
                    'is_active': True,
                }
            )
            if created:
                products_created += 1

            # Generate SVG image locally inside MEDIA_ROOT/products/
            image_filename = f"{p_data['slug']}.svg"
            image_relative_path = f"products/{image_filename}"
            image_full_path = os.path.join(media_products_dir, image_filename)

            if not os.path.exists(image_full_path):
                svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <rect width="600" height="600" rx="36" fill="{p_data['bg_color']}"/>
  <circle cx="300" cy="260" r="140" fill="white" opacity="0.1"/>
  <path d="M 220 340 L 380 340 L 340 180 L 260 180 Z" fill="none" stroke="{p_data['text_color']}" stroke-width="8" stroke-linejoin="round"/>
  <text x="300" y="270" font-family="Inter, system-ui, sans-serif" font-size="42" font-weight="800" fill="{p_data['text_color']}" text-anchor="middle">{p_data['brand_slug'].upper()}</text>
  <text x="300" y="440" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="700" fill="{p_data['text_color']}" text-anchor="middle">{p_data['name']}</text>
  <text x="300" y="480" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="500" fill="{p_data['text_color']}" opacity="0.8" text-anchor="middle">Official Development Demo Product</text>
</svg>"""
                with open(image_full_path, 'w', encoding='utf-8') as f:
                    f.write(svg_content)

            # ProductImage record
            ProductImage.objects.get_or_create(
                product=product,
                is_primary=True,
                defaults={
                    'image': image_relative_path,
                    'alt_text': f"{product.name} Image",
                    'display_order': 0,
                }
            )

            # Variants & Inventory (Update prices to INR)
            for v_data in p_data['variants']:
                variant, v_created = ProductVariant.objects.update_or_create(
                    sku=v_data['sku'],
                    defaults={
                        'product': product,
                        'price': Decimal(v_data['price']),
                        'discount_price': Decimal(v_data['discount']) if v_data['discount'] else None,
                        'is_active': True,
                    }
                )
                variants_updated += 1

                # Set attribute values
                attr_objs = [get_attr_value(a, v) for a, v in v_data['attrs']]
                variant.attribute_values.set(attr_objs)

                # Inventory record
                inv, inv_created = Inventory.objects.get_or_create(
                    product_variant=variant,
                    defaults={
                        'quantity': v_data['stock'],
                        'reserved_quantity': 0,
                        'reorder_level': 5,
                    }
                )

                if inv_created and v_data['stock'] > 0:
                    InventoryTransaction.objects.create(
                        inventory=inv,
                        transaction_type=InventoryTransaction.TransactionType.RESTOCK,
                        quantity=v_data['stock'],
                        reference='Initial Demo Seed'
                    )

        self.stdout.write(self.style.SUCCESS(
            f'INR Seeding finished successfully! Processed {len(products_catalog)} products, '
            f'updated {variants_updated} variant prices to INR.'
        ))
