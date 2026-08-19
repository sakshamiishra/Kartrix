import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Award, ShieldCheck } from 'lucide-react';
import { productApi } from '../api/productApi';

export const BrandsPage = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      setLoading(true);
      try {
        const data = await productApi.getBrands();
        setBrands(data.results || []);
      } catch (err) {
        console.error('Error fetching brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/20 dark:via-amber-500/10 dark:to-transparent p-6 sm:p-8 rounded-3xl border border-orange-100 dark:border-orange-950/40">
        <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400 font-semibold text-xs uppercase tracking-wider mb-2">
          <Award className="w-4 h-4" />
          <span>Featured Manufacturers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Browse Brands
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
          Discover products from top trusted brands and global manufacturers. Select any brand to view all available catalog items.
        </p>
      </div>

      {/* Brands Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#17191B] rounded-2xl p-6 border border-gray-100 dark:border-[#2A2D32] animate-pulse space-y-4"
            >
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mx-auto"></div>
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-8 space-y-4">
          <Award className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Brands Available</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Brands will appear here once added to the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/brands/${brand.slug}`}
              className="group bg-white dark:bg-[#17191B] border border-gray-100 dark:border-[#2A2D32] hover:border-orange-500/50 dark:hover:border-orange-500/50 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center space-y-4"
            >
              {/* Brand Logo / Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-[#0F1011] border border-gray-100 dark:border-[#2A2D32] p-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {brand.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {brand.name}
                  </h3>
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {brand.description || `Explore authentic products from ${brand.name}.`}
                </p>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center text-xs font-bold text-orange-600 dark:text-orange-400 gap-1 group-hover:translate-x-1 transition-transform">
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
