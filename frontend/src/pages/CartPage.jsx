import React from 'react';
import { Link } from 'react-router';
import { ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CartSummary } from '../components/cart/CartSummary';
import { LoadingSpinner } from '../components/common/LoadingSkeleton';

export const CartPage = () => {
  const { cartItems, totalItems, cartSubtotal, loading, updateQuantity, removeFromCart, clearCart } = useCart();

  if (loading && cartItems.length === 0) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="py-16 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-3xl flex items-center justify-center mx-auto border border-orange-200 dark:border-orange-900">
          <ShoppingBag className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Your Shopping Cart is Empty</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Looks like you haven't added any products to your cart yet.
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

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#2A2D32] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Shopping Cart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You have <span className="font-bold text-gray-900 dark:text-white">{totalItems}</span> {totalItems === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
            />
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <CartSummary
            subtotal={cartSubtotal}
            itemCount={totalItems}
            onClear={clearCart}
          />
        </div>

      </div>

    </div>
  );
};
