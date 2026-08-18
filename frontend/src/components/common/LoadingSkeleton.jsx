import React from 'react';

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] overflow-hidden p-3 animate-pulse space-y-3">
      <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
      <div className="space-y-2 pt-1">
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/4 pt-1"></div>
      </div>
    </div>
  );
};

export const ProductGridSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const ProductDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
      <div className="space-y-4">
        <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
        <div className="flex gap-4">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
      <div className="space-y-6 pt-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/5"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl w-full"></div>
      </div>
    </div>
  );
};
