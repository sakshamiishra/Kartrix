import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export const VariantSelector = ({ variants = [], onVariantChange }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (variants && variants.length > 0) {
      setSelectedVariant(variants[0]);
      if (onVariantChange) {
        onVariantChange(variants[0]);
      }
    }
  }, [variants]);

  const handleSelect = (variant) => {
    setSelectedVariant(variant);
    if (onVariantChange) {
      onVariantChange(variant);
    }
  };

  if (!variants || variants.length === 0) {
    return (
      <div className="py-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          In Stock
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Variants Pills */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Select Variant / Option:
        </label>
        <div className="flex flex-wrap gap-2.5">
          {variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const stock = variant.inventory?.available_stock ?? 0;
            const isOutOfStock = stock <= 0;

            return (
              <button
                key={variant.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => handleSelect(variant)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isOutOfStock
                    ? 'border-gray-200 dark:border-[#2A2D32] bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed line-through'
                    : isSelected
                    ? 'border-orange-600 dark:border-orange-500 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500/20'
                    : 'border-gray-200 dark:border-[#2A2D32] bg-white dark:bg-[#17191B] text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />}
                <span>{variant.sku || `Variant ${variant.id}`}</span>
                {variant.price && (
                  <span className="text-[11px] font-normal opacity-80">₹{parseFloat(variant.price).toLocaleString('en-IN')}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Status Indicator */}
      <div className="flex items-center gap-2">
        {selectedVariant?.inventory?.available_stock > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            In Stock ({selectedVariant.inventory.available_stock} available)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Out of Stock
          </span>
        )}
      </div>
    </div>
  );
};
