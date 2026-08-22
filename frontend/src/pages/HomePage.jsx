import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ShoppingBag, Truck, ShieldCheck, Headphones, ArrowRight, Sparkles, Layers } from 'lucide-react';
import { productApi } from '../api/productApi';
import { ProductCard } from '../components/products/ProductCard';
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton';
import { RecommendedProductsSection } from '../components/products/RecommendedProductsSection';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodData, catData] = await Promise.all([
          productApi.getProducts({ page_size: 4 }),
          productApi.getCategories(),
        ]);
        setFeaturedProducts(prodData.results || []);
        setCategories(catData.results || []);
      } catch (err) {
        console.error('Error fetching home page data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const heroProduct = featuredProducts.length > 0 ? featuredProducts[0] : null;

  const getHeroImageUrl = (product) => {
    if (!product || !product.primary_image) return null;
    if (product.primary_image.startsWith('http')) {
      return product.primary_image;
    }
    return `http://localhost:8000${product.primary_image}`;
  };

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section — Real backend product or graceful empty state */}
      <section className="relative overflow-hidden bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-8 lg:p-12 shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Hero Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-900">
              <Sparkles className="w-3.5 h-3.5" />
              <span>FEATURED COLLECTION</span>
            </div>

            {heroProduct ? (
              <>
                <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                  {heroProduct.name}
                </h1>

                {heroProduct.starting_price && (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{parseFloat(heroProduct.starting_price).toLocaleString('en-IN')}
                  </p>
                )}

                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                  {heroProduct.description || 'Explore our newest catalog product available on Kartrix.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    to={`/products/${heroProduct.slug || heroProduct.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-105"
                  >
                    <span>Shop Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/products"
                    className="px-6 py-3.5 bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-semibold text-sm rounded-xl border border-gray-200 dark:border-[#2A2D32] transition-colors"
                  >
                    View Collection
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
                  Featured products coming soon
                </h1>

                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                  We don't have a featured product available right now. Explore our catalog to see all available products.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-105"
                  >
                    <span>Browse Products</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/products"
                    className="px-6 py-3.5 bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-semibold text-sm rounded-xl border border-gray-200 dark:border-[#2A2D32] transition-colors"
                  >
                    View Categories
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Right Hero Visual Element */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-orange-400/5 to-transparent rounded-full blur-2xl"></div>
            <div className="relative aspect-square w-full max-w-md bg-gray-50 dark:bg-[#0F1011] rounded-3xl border border-gray-100 dark:border-[#2A2D32] overflow-hidden p-6 flex items-center justify-center shadow-inner">
              {heroProduct && getHeroImageUrl(heroProduct) ? (
                <img
                  src={getHeroImageUrl(heroProduct)}
                  alt={heroProduct.name}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Kartrix Catalog</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Discover premium items across categories</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Feature Service Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-6 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Free Delivery</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">On orders over ₹1,000</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-6 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Secure Payment</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">100% secure payments</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-6 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">24/7 Support</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dedicated customer support</p>
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      {categories.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Browse Categories
            </h2>
            <Link to="/products" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug || cat.id}`}
                className="group bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-4 text-center transition-all hover:-translate-y-1 hover:border-orange-500/30 shadow-sm"
              >
                <div className="w-12 h-12 mx-auto rounded-xl bg-gray-100 dark:bg-[#0F1011] flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:bg-orange-600 group-hover:text-white transition-colors mb-3">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Featured Products
          </h2>
          <Link to="/products" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">
            See All Products
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </section>

      {/* Recommendations Section */}
      <RecommendedProductsSection limit={6} />

    </div>
  );
};
