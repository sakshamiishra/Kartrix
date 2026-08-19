import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Package, MapPin, Clock, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { useToast } from '../context/ToastContext';

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        const data = await orderApi.getOrderByNumber(orderNumber);
        setOrder(data);
      } catch (err) {
        addToast('Failed to load order details.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetail();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="h-48 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] animate-pulse" />
        <div className="h-64 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400">The requested order number could not be retrieved.</p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot || order.address_detail;
  const formattedSubtotal = parseFloat(order.subtotal || 0).toLocaleString('en-IN');
  const formattedTotal = parseFloat(order.total_amount || 0).toLocaleString('en-IN');
  const createdDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Navigation & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-[#2A2D32] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Order #{order.order_number}</h1>
            <span className="px-3 py-1 text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-full border border-orange-200 dark:border-orange-800">
              {order.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Placed on {createdDate}</span>
          </p>
        </div>

        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Orders</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Shipping Address Card */}
        <div className="md:col-span-2 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span>Delivery Shipping Address</span>
          </h2>
          {addr ? (
            <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <p className="font-bold text-gray-900 dark:text-white">{addr.full_name}</p>
              <p>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
              <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
              <p>{addr.country}</p>
              <p className="text-xs text-gray-500 pt-1">Phone: {addr.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Address details unavailable.</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span>Payment Summary</span>
          </h2>
          <div className="text-xs space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Status</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">{order.payment_status}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">₹{formattedSubtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
              <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
            </div>
            <div className="border-t border-gray-100 dark:border-[#2A2D32] pt-2 flex justify-between text-sm font-extrabold text-gray-900 dark:text-white">
              <span>Total Paid/Due</span>
              <span className="text-orange-600 dark:text-orange-400">₹{formattedTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          <span>Ordered Items ({order.items?.length || 0})</span>
        </h2>

        <div className="divide-y divide-gray-100 dark:divide-[#2A2D32]">
          {order.items?.map((item) => {
            const unitPriceFormatted = parseFloat(item.unit_price || 0).toLocaleString('en-IN');
            const itemSubtotalFormatted = parseFloat(item.subtotal || 0).toLocaleString('en-IN');

            return (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Quantity: {item.quantity} × ₹{unitPriceFormatted}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">₹{itemSubtotalFormatted}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Status Timeline */}
      {order.status_history?.length > 0 && (
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span>Order Status History</span>
          </h2>
          <div className="space-y-3">
            {order.status_history.map((sh) => (
              <div key={sh.id} className="flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-gray-900 dark:text-white">{sh.status}</p>
                  {sh.note && <p className="text-gray-500">{sh.note}</p>}
                  <p className="text-[10px] text-gray-400">
                    {new Date(sh.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetailPage;
