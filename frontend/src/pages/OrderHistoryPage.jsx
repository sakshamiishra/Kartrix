import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Package, Clock, ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { useToast } from '../context/ToastContext';

export function OrderHistoryPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderApi.getOrders();
        setOrders(data.results || data);
      } catch (err) {
        addToast('Failed to load order history.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'PLACED':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'CONFIRMED':
      case 'PROCESSING':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'DELIVERED':
        return 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'CANCELLED':
        return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#2A2D32] pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">My Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your order history.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No Orders Placed Yet</h2>
          <p className="text-gray-500 dark:text-gray-400">When you place orders, they will appear here so you can track delivery progress.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Start Shopping</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const formattedTotal = parseFloat(order.total_amount || 0).toLocaleString('en-IN');
            const createdDate = new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-[#2A2D32] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-base text-gray-900 dark:text-white">Order #{order.order_number}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Placed on {createdDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Total Amount</span>
                      <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">₹{formattedTotal}</span>
                    </div>

                    <Link
                      to={`/orders/${order.order_number}`}
                      className="px-4 py-2 bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-[#2A2D32] flex items-center gap-1 transition-colors"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs py-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-gray-900 dark:text-white">{item.quantity} ×</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate">{item.product_name}</span>
                      </div>
                      <span className="font-medium text-gray-500">
                        ₹{parseFloat(item.subtotal || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;
