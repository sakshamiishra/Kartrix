import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Grid, Tag } from 'lucide-react';
import { productApi } from '../api/productApi';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const data = await productApi.getCategories();
        setCategories(data.results || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-500/20 dark:via-amber-500/10 dark:to-transparent p-6 sm:p-8 rounded-3xl border border-orange-100 dark:border-orange-950/40">
        <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400 font-semibold text-xs uppercase tracking-wider mb-2">
          <Grid className="w-4 h-4" />
          <span>Product Collections</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Browse Categories
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
          Explore our wide range of curated collections. Select any category to view all matching items in our active catalog.
        </p>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#17191B] rounded-2xl p-4 border border-gray-100 dark:border-[#2A2D32] animate-pulse space-y-4"
            >
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-8 space-y-4">
          <Tag className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Categories Available</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Categories will appear here once added to the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              className="group bg-white dark:bg-[#17191B] border border-gray-100 dark:border-[#2A2D32] hover:border-orange-500/50 dark:hover:border-orange-500/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Category Image */}
              <div className="relative w-full h-48 bg-gray-100 dark:bg-[#0F1011] overflow-hidden">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/20 text-orange-600 dark:text-orange-400 font-bold text-3xl">
                    {category.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                <span className="absolute bottom-3 left-4 text-xs font-semibold text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                  Category
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {category.description || `Browse all active products under ${category.name}.`}
                  </p>
                </div>

                <div className="flex items-center text-xs font-bold text-orange-600 dark:text-orange-400 gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Browse Category</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
