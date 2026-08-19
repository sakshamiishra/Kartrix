import React from 'react';
import { Link } from 'react-router';
import { Trash2, Plus, Minus } from 'lucide-react';

export const CartItemRow = ({ item, onUpdateQuantity, onRemove }) => {
  const product = item.product_detail || {};
  const variant = item.product_variant_detail || null;

  const getImageUrl = () => {
    if (product.primary_image) {
      if (product.primary_image.startsWith('http')) return product.primary_image;
      return `http://localhost:8000${product.primary_image}`;
    }
    return null;
  };

  const getVariantLabel = () => {
    if (!variant || !variant.attribute_values_detail) return null;
    return variant.attribute_values_detail.map(attr => attr.value).join(' / ');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] transition-colors shadow-sm">
      
      {/* Product Image & Meta */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-[#0F1011] border border-gray-100 dark:border-[#2A2D32] overflow-hidden shrink-0 flex items-center justify-center p-2">
          {getImageUrl() ? (
            <img src={getImageUrl()} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No Image</span>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <Link
            to={`/products/${product.slug || product.id}`}
            className="text-sm sm:text-base font-bold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-1"
          >
            {product.name || 'Unnamed Product'}
          </Link>

          {getVariantLabel() && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Variant: <span className="font-semibold text-gray-700 dark:text-gray-300">{getVariantLabel()}</span>
            </p>
          )}

          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            ₹{parseFloat(item.unit_price).toLocaleString('en-IN')} each
          </p>
        </div>
      </div>

      {/* Quantity Stepper & Price Subtotal */}
      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-[#2A2D32]">
        
        {/* Quantity Controls */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#0F1011] p-1 rounded-xl border border-gray-200 dark:border-[#2A2D32]">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#17191B] rounded-lg transition-colors"
            title="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          
          <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">
            {item.quantity}
          </span>

          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#17191B] rounded-lg transition-colors"
            title="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Item Subtotal */}
        <div className="text-right">
          <p className="text-base font-extrabold text-gray-900 dark:text-white">
            ₹{parseFloat(item.subtotal).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Trash Button */}
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
