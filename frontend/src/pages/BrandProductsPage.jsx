import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { ChevronRight, SlidersHorizontal, ArrowUpDown, Award } from 'lucide-react';
import { productApi } from '../api/productApi';
import { SidebarFilter } from '../components/common/SidebarFilter';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';

export const BrandProductsPage = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [brandInfo, setBrandInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';
  const ordering = searchParams.get('ordering') || '-created_at';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Fetch filter metadata & current brand detail
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          productApi.getCategories(),
          productApi.getBrands(),
        ]);
        setCategories(catRes.results || []);
        const allBrands = brandRes.results || [];
        setBrands(allBrands);

        const currentBrand = allBrands.find((b) => b.slug === slug);
        setBrandInfo(currentBrand || { name: slug, slug });
      } catch (err) {
        console.error('Error fetching brand metadata:', err);
      }
    };
    fetchMetadata();
  }, [slug]);

  // Fetch brand products
  useEffect(() => {
    const fetchBrandProducts = async () => {
      setLoading(true);
      try {
        const params = {
          brand: slug,
          page: currentPage,
        };
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (minPrice) params.min_price = minPrice;
        if (maxPrice) params.max_price = maxPrice;
        if (ordering) params.ordering = ordering;

        const data = await productApi.getProducts(params);
        setProducts(data.results || []);
        setTotalCount(data.count || 0);
      } catch (err) {
        console.error('Error fetching brand products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrandProducts();
  }, [slug, searchQuery, selectedCategory, minPrice, maxPrice, ordering, currentPage]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
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
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/brands" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
          Brands
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-white capitalize">
          {brandInfo?.name || slug}
        </span>
      </nav>

      {/* Brand Header Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/20 dark:via-amber-500/10 dark:to-transparent p-6 rounded-2xl border border-orange-100 dark:border-orange-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Brand Collection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight capitalize">
            {brandInfo?.name || slug}
          </h1>
          {brandInfo?.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xl">
              {brandInfo.description}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Showing {totalCount} items from this brand
          </p>
        </div>

        {/* Mobile Filter Trigger & Sorting */}
        <div className="flex items-center gap-3 shrink-0">
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

      {/* Main Layout */}
      <div className="flex gap-8">
        {/* Desktop Sidebar Filter */}
        <div className="hidden lg:block">
          <SidebarFilter
            categories={categories}
            brands={brands}
            selectedCategory={selectedCategory}
            setSelectedCategory={(val) => updateParam('category', val)}
            selectedBrand={slug}
            setSelectedBrand={() => {}} // Brand locked to current page context
            searchQuery={searchQuery}
            setSearchQuery={(val) => updateParam('search', val)}
            minPrice={minPrice}
            setMinPrice={(val) => updateParam('min_price', val)}
            maxPrice={maxPrice}
            setMaxPrice={(val) => updateParam('max_price', val)}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Product Results */}
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

      {/* Mobile Filter Drawer */}
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
              selectedBrand={slug}
              setSelectedBrand={() => {}}
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
