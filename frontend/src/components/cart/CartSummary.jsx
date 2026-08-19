import React from 'react';
import { ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const CartSummary = ({ subtotal, itemCount, onClear }) => {
  const { addToast } = useToast();

  const handleCheckoutClick = () => {
    addToast('Checkout features will unlock in Phase 7.', 'info');
  };

  const formattedSubtotal = parseFloat(subtotal || 0).toLocaleString('en-IN');

  return (
    <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-6 shadow-sm sticky top-24">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-orange-600" />
        <span>Order Summary</span>
      </h3>

      <div className="space-y-3 border-t border-b border-gray-100 dark:border-[#2A2D32] py-4 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <span className="font-semibold text-gray-900 dark:text-white">₹{formattedSubtotal}</span>
        </div>
        
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Shipping Estimate</span>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Calculated at checkout</span>
        </div>

        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Tax</span>
          <span className="text-xs font-semibold text-gray-500">Calculated at checkout</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-base font-extrabold text-gray-900 dark:text-white">
        <span>Total Estimate</span>
        <span className="text-xl text-orange-600 dark:text-orange-400">₹{formattedSubtotal}</span>
      </div>

      <div className="space-y-3 pt-2">
        <button
          onClick={handleCheckoutClick}
          className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          <span>Proceed to Checkout (Phase 7)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {itemCount > 0 && (
          <button
            onClick={onClear}
            className="w-full py-2.5 bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl border border-gray-200 dark:border-[#2A2D32] transition-colors"
          >
            Clear Shopping Cart
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 justify-center pt-2">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <span>100% Secure Checkout Guarantee</span>
      </div>
    </div>
  );
};
