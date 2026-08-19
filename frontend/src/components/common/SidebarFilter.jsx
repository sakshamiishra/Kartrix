import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export const SidebarFilter = ({
  categories = [],
  brands = [],
  selectedCategory,
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand,
  searchQuery,
  setSearchQuery,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  onClearFilters,
  isMobile = false,
  onCloseMobile,
}) => {
  return (
    <div className={`space-y-6 ${isMobile ? 'p-4' : 'w-64 shrink-0'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2A2D32]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-600 dark:text-orange-500" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Filters</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClearFilters}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
          >
            Clear All
          </button>
          {isMobile && (
            <button onClick={onCloseMobile} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#17191B]">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Search Filter */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Search Products
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Type keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 dark:bg-[#17191B] border border-transparent dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Categories
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400">
            <input
              type="radio"
              name="category"
              checked={!selectedCategory}
              onChange={() => setSelectedCategory('')}
              className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 dark:bg-[#17191B] dark:border-[#2A2D32]"
            />
            <span>All Categories</span>
          </label>

          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400"
            >
              <input
                type="radio"
                name="category"
                checked={selectedCategory === String(cat.id) || selectedCategory === cat.slug}
                onChange={() => setSelectedCategory(cat.slug || String(cat.id))}
                className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 dark:bg-[#17191B] dark:border-[#2A2D32]"
              />
              <span className="truncate">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Brand Filter */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Brands
        </label>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400">
            <input
              type="radio"
              name="brand"
              checked={!selectedBrand}
              onChange={() => setSelectedBrand('')}
              className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 dark:bg-[#17191B] dark:border-[#2A2D32]"
            />
            <span>All Brands</span>
          </label>

          {brands.map((b) => (
            <label
              key={b.id}
              className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400"
            >
              <input
                type="radio"
                name="brand"
                checked={selectedBrand === String(b.id) || selectedBrand === b.slug}
                onChange={() => setSelectedBrand(b.slug || String(b.id))}
                className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 dark:bg-[#17191B] dark:border-[#2A2D32]"
              />
              <span className="truncate">{b.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Price Range (₹)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Min (₹)"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-[#17191B] border border-transparent dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
          <input
            type="number"
            placeholder="Max (₹)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-100 dark:bg-[#17191B] border border-transparent dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {isMobile && (
        <button
          onClick={onCloseMobile}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl text-sm transition-colors shadow-md"
        >
          Apply Filters
        </button>
      )}
    </div>
  );
};
