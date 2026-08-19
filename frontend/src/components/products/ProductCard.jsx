import React from 'react';
import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

export const ProductCard = ({ product }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const saved = isInWishlist(product.id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const API_BASE_URL = 'http://localhost:8000';
  
  const getImageUrl = () => {
    if (!product.primary_image) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600';
    }
    if (product.primary_image.startsWith('http')) {
      return product.primary_image;
    }
    return `${API_BASE_URL}${product.primary_image}`;
  };

  const displayPrice = product.starting_price 
    ? `₹${parseFloat(product.starting_price).toLocaleString('en-IN')}`
    : '₹0';

  const categoryName = typeof product.category === 'object' ? product.category?.name : null;
  const brandName = typeof product.brand === 'object' ? product.brand?.name : null;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="group bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-3 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/60 hover:-translate-y-1 flex flex-col justify-between"
    >
      <div className="relative aspect-square w-full rounded-xl bg-gray-100 dark:bg-[#0F1011] overflow-hidden mb-3">
        <img
          src={getImageUrl()}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600';
          }}
        />

        {/* Live Wishlist Toggle Button */}
        <button
          onClick={handleWishlistClick}
          aria-label="Add to wishlist"
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-all ${
            saved
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-white/90 dark:bg-[#17191B]/90 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="space-y-1 px-1">
        {(brandName || categoryName) && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">
            {brandName || categoryName}
          </p>
        )}

        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {displayPrice}
          </span>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded-full">
            In Stock
          </span>
        </div>
      </div>
    </Link>
  );
};
