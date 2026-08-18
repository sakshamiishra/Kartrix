from django.contrib import admin
from .models import (
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

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'brand', 'sku', 'is_active', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('category', 'brand', 'is_active')
    search_fields = ('name', 'sku', 'slug')

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'is_primary', 'display_order', 'created_at')

@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ('attribute', 'value')

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'sku', 'price', 'discount_price', 'is_active')
    search_fields = ('sku', 'product__name')

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product_variant', 'quantity', 'reserved_quantity', 'available_stock', 'reorder_level')

@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ('inventory', 'transaction_type', 'quantity', 'reference', 'created_at')
