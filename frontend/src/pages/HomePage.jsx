import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ShoppingBag, Truck, ShieldCheck, Headphones, ArrowRight, Sparkles } from 'lucide-react';
import { productApi } from '../api/productApi';
import { ProductCard } from '../components/products/ProductCard';
import { ProductGridSkeleton } from '../components/common/LoadingSkeleton';

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

  const heroProduct = featuredProducts[0];

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section — Styled matching ui ref ins.png and ui ref.png */}
      <section className="relative overflow-hidden bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-8 lg:p-12 shadow-sm transition-colors duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider border border-orange-200 dark:border-orange-900">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEW COLLECTION</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
              {heroProduct ? heroProduct.name : 'ASTRO WINTER ARMOR II'}
            </h1>

            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {heroProduct?.starting_price ? `$${parseFloat(heroProduct.starting_price).toFixed(2)}` : '$560.00'}
            </p>

            <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
              {heroProduct?.description || 'Premium outerwear designed for ultimate comfort, extreme weather durability, and modern minimalist urban aesthetic.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={heroProduct ? `/products/${heroProduct.slug || heroProduct.id}` : '/products'}
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
          </div>

          {/* Right Product Image on Rounded Container Shape */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-orange-400/5 to-transparent rounded-full blur-2xl"></div>
            <div className="relative aspect-square w-full max-w-md bg-gray-50 dark:bg-[#0F1011] rounded-3xl border border-gray-100 dark:border-[#2A2D32] overflow-hidden p-6 flex items-center justify-center shadow-inner">
              <img
                src={
                  heroProduct?.primary_image
                    ? heroProduct.primary_image.startsWith('http')
                      ? heroProduct.primary_image
                      : `http://localhost:8000${heroProduct.primary_image}`
                    : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'
                }
                alt="Featured Product"
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800';
                }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Feature Service Cards — Styled matching ui ref ins.png Section 8 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-6 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Free Delivery</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">On orders over $100</p>
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

    </div>
  );
};
