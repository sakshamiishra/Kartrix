import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { recommendationApi } from '../../api/recommendationApi';
import { ProductCard } from './ProductCard';
import { useAuth } from '../../context/AuthContext';

export const RecommendedProductsSection = ({ limit = 6, categoryId = null }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [recommendationType, setRecommendationType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await recommendationApi.getRecommendations({
          limit,
          categoryId,
        });
        if (isMounted) {
          setProducts(data.results || []);
          setRecommendationType(data.recommendation_type || 'BASIC_FALLBACK');
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Recommendation API call failed, degrading gracefully:', err);
          setError(true);
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, [categoryId, user?.id, limit]);

  // Gracefully hide section if an error occurred or zero products were returned after loading
  if (error || (!loading && products.length === 0)) {
    return null;
  }

  const isPersonalized = recommendationType === 'DEEPFM_PERSONALIZED';
  const badgeLabel = isPersonalized ? 'Personalized for You' : 'Popular Items';

  return (
    <section className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent dark:from-orange-500/10 dark:via-amber-500/5 dark:to-transparent border border-orange-100 dark:border-orange-950/30 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              Recommended for You
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isPersonalized
                ? 'Curated tailored suggestions based on your shopping interactions.'
                : 'Top trending and highly rated items across our catalog.'}
            </p>
          </div>
        </div>

        <span
          className={`text-[11px] font-semibold px-3 py-1 rounded-full border shrink-0 self-start sm:self-auto ${
            isPersonalized
              ? 'text-orange-700 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-950/60 border-orange-200 dark:border-orange-900/50'
              : 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/50'
          }`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Grid Content / Skeleton Loading */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-3 space-y-3 animate-pulse"
            >
              <div className="aspect-square w-full rounded-xl bg-gray-200 dark:bg-[#2A2D32]" />
              <div className="h-3 bg-gray-200 dark:bg-[#2A2D32] rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-[#2A2D32] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
