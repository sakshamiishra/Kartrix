 import React from 'react';
import { Link } from 'react-router';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { LoadingSpinner } from '../components/common/LoadingSkeleton';

export const WishlistPage = () => {
  const { wishlistItems, loading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (loading && wishlistItems.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="py-16 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
          <Heart className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Your Wishlist is Empty</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Save products you like to your wishlist while browsing.
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-105"
        >
          <span>Explore Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleMoveToCart = async (item) => {
    const product = item.product_detail || item.product;
    if (product) {
      const added = await addToCart(product, null, 1);
      if (added) {
        await removeFromWishlist(item.id);
      }
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#2A2D32] pb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Saved Wishlist</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          You have <span className="font-bold text-gray-900 dark:text-white">{wishlistItems.length}</span> {wishlistItems.length === 1 ? 'saved item' : 'saved items'}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlistItems.map((item) => {
          const product = item.product_detail || {};
          const getImageUrl = () => {
            if (product.primary_image) {
              if (product.primary_image.startsWith('http')) return product.primary_image;
              return `http://localhost:8000${product.primary_image}`;
            }
            return null;
          };

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] p-4 flex flex-col justify-between space-y-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="relative aspect-square w-full bg-gray-50 dark:bg-[#0F1011] rounded-xl overflow-hidden p-4 flex items-center justify-center">
                  {getImageUrl() ? (
                    <img src={getImageUrl()} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-400">No Image</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Link
                    to={`/products/${product.slug || product.id}`}
                    className="font-bold text-sm text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-1"
                  >
                    {product.name || 'Unnamed Product'}
                  </Link>

                  {product.starting_price && (
                    <p className="text-sm font-extrabold text-orange-600 dark:text-orange-400">
                      ₹{parseFloat(product.starting_price).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-[#2A2D32]">
                <button
                  onClick={() => handleMoveToCart(item)}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Move to Cart</span>
                </button>

                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="w-full py-2 bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
