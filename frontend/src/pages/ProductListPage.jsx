import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { productApi } from '../api/productApi';
import { SidebarFilter } from '../components/common/SidebarFilter';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { RecommendedProductsSection } from '../components/products/RecommendedProductsSection';

export const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state with URL params
  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedBrand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const ordering = searchParams.get('ordering') || '-created_at';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Derive category_id if selectedCategory filter is active
  const currentCategoryObj = categories.find(
    (c) => c.slug === selectedCategory || String(c.id) === String(selectedCategory)
  );
  const currentCategoryId = currentCategoryObj
    ? currentCategoryObj.id
    : selectedCategory && !isNaN(selectedCategory)
    ? parseInt(selectedCategory, 10)
    : null;

  // Fetch Categories & Brands once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          productApi.getCategories(),
          productApi.getBrands(),
        ]);
        setCategories(catRes.results || []);
        setBrands(brandRes.results || []);
      } catch (err) {
        console.error('Error fetching filter metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Products whenever query params change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
        };
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedBrand) params.brand = selectedBrand;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;
        if (ordering) params.ordering = ordering;

        const data = await productApi.getProducts(params);
        setProducts(data.results || []);
        setTotalCount(data.count || 0);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchQuery, selectedCategory, selectedBrand, minPrice, maxPrice, ordering, currentPage]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset page to 1 on filter changes
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2A2D32]">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Products Catalog
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Showing {totalCount} active items in catalog
          </p>
        </div>

        {/* Mobile Filter Trigger & Sort Dropdown */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#17191B] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-orange-500"
          >
            <SlidersHorizontal className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <span>Filters</span>
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-[#17191B] border border-gray-200 dark:border-[#2A2D32] px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={ordering}
              onChange={(e) => updateParam('ordering', e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="-created_at" className="dark:bg-[#17191B]">Sort by: Newest</option>
              <option value="name" className="dark:bg-[#17191B]">Sort by: Name (A-Z)</option>
              <option value="variants__price" className="dark:bg-[#17191B]">Sort by: Price (Low to High)</option>
              <option value="-variants__price" className="dark:bg-[#17191B]">Sort by: Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live DeepFM & Popular Recommendations Section */}
      <RecommendedProductsSection categoryId={currentCategoryId} limit={6} />

      {/* Main Content Layout */}
      <div className="flex gap-8">
        
        {/* Persistent Desktop Sidebar Filter */}
        <div className="hidden lg:block">
          <SidebarFilter
            categories={categories}
            brands={brands}
            selectedCategory={selectedCategory}
            setSelectedCategory={(val) => updateParam('category', val)}
            selectedBrand={selectedBrand}
            setSelectedBrand={(val) => updateParam('brand', val)}
            searchQuery={searchQuery}
            setSearchQuery={(val) => updateParam('search', val)}
            minPrice={minPrice}
            setMinPrice={(val) => updateParam('min_price', val)}
            maxPrice={maxPrice}
            setMaxPrice={(val) => updateParam('max_price', val)}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Product Results Grid */}
        <div className="flex-1 space-y-8">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={12}
                onPageChange={(page) => updateParam('page', String(page))}
              />
            </>
          )}
        </div>

      </div>

      {/* Mobile Filter Drawer Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          ></div>
          <div className="relative ml-auto w-full max-w-xs bg-white dark:bg-[#0F1011] h-full shadow-2xl overflow-y-auto">
            <SidebarFilter
              categories={categories}
              brands={brands}
              selectedCategory={selectedCategory}
              setSelectedCategory={(val) => updateParam('category', val)}
              selectedBrand={selectedBrand}
              setSelectedBrand={(val) => updateParam('brand', val)}
              searchQuery={searchQuery}
              setSearchQuery={(val) => updateParam('search', val)}
              minPrice={minPrice}
              setMinPrice={(val) => updateParam('min_price', val)}
              maxPrice={maxPrice}
              setMaxPrice={(val) => updateParam('max_price', val)}
              onClearFilters={handleClearFilters}
              isMobile={true}
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
};
