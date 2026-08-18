import React from 'react';
import { ProductCard } from './ProductCard';

export const ProductGrid = ({ products = [] }) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32]">
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">No products found</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search or filter settings.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
