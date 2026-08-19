import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Flame, Percent, ArrowUpDown, Tag, ShoppingBag } from 'lucide-react';
import { productApi } from '../api/productApi';
import { ProductGrid } from '../components/products/ProductGrid';
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';

export const DealsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const ordering = searchParams.get('ordering') || '-created_at';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const data = await productApi.getProducts({
          on_sale: true,
          page: currentPage,
          ordering: ordering,
        });
        setProducts(data.results || []);
        setTotalCount(data.count || 0);
      } catch (err) {
        console.error('Error fetching active deals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [ordering, currentPage]);

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

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/5 dark:from-red-950/30 dark:via-orange-950/20 dark:to-transparent p-6 sm:p-8 rounded-3xl border border-red-200/50 dark:border-red-900/40 relative overflow-hidden">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-xs uppercase tracking-wider mb-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <span>Limited Time Offers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <span>Active Deals & Offers</span>
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
            Save Big
          </span>
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
          Discover exclusive discounts across our product catalog. Enjoy top savings on select items with verified price reductions.
        </p>
      </div>

      {/* Toolbar & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2A2D32]">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Tag className="w-4 h-4 text-orange-500" />
          <span>Showing {totalCount} active deals in catalog</span>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-[#17191B] border border-gray-200 dark:border-[#2A2D32] px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-200 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={ordering}
            onChange={(e) => updateParam('ordering', e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="-created_at" className="dark:bg-[#17191B]">Sort by: Newest Deals</option>
            <option value="name" className="dark:bg-[#17191B]">Sort by: Name (A-Z)</option>
            <option value="variants__price" className="dark:bg-[#17191B]">Sort by: Price (Low to High)</option>
            <option value="-variants__price" className="dark:bg-[#17191B]">Sort by: Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-8 space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
            <Percent className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Active Deals Currently</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Check back soon! We update our special offers regularly. Explore our full catalog to browse all available products.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-full transition-colors shadow-md shadow-orange-600/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore All Products</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <ProductGrid products={products} />
          <Pagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={12}
            onPageChange={(page) => updateParam('page', String(page))}
          />
        </div>
      )}
    </div>
  );
};
