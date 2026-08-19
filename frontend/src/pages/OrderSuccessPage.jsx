import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { CheckCircle2, ShoppingBag, ArrowRight, MapPin, CreditCard, ShieldCheck, Package } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { useToast } from '../context/ToastContext';

export function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderApi.getOrderByNumber(orderNumber);
        setOrder(data);
      } catch (err) {
        addToast('Failed to load order details.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 animate-pulse">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-xl w-64 mx-auto animate-pulse" />
        <div className="h-48 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Information Unavailable</h2>
        <p className="text-gray-500 dark:text-gray-400">The requested order number could not be retrieved.</p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl"
        >
          <span>View My Orders</span>
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot || order.address_detail;
  const formattedTotal = parseFloat(order.total_amount || 0).toLocaleString('en-IN');
  const formattedSubtotal = parseFloat(order.subtotal || 0).toLocaleString('en-IN');
  const transactionId = order.payment?.transaction_id || order.payment?.gateway_payment_id || 'N/A';

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 pt-4">
      {/* Banner / Success Hero Header */}
      <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-8 text-center space-y-4 shadow-sm">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Order Placed Successfully!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Thank you for shopping with EasyKart. Your payment has been verified and your order is confirmed.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 font-mono text-xs font-bold rounded-full border border-green-200 dark:border-green-800/50">
          <span>Order #{order.order_number}</span>
        </div>
      </div>

      {/* Payment & Order Summary Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Payment Details Card */}
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span>Payment Summary</span>
          </h2>
          <div className="text-xs space-y-2.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Payment Status</span>
              <span className="font-bold text-green-600 dark:text-green-400 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{order.payment_status}</span>
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Payment Method</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {order.payment?.payment_method === 'RAZORPAY' ? 'Razorpay Online' : (order.payment?.payment_method || 'Razorpay')}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Transaction ID</span>
              <span className="font-mono text-[10px] text-gray-900 dark:text-white truncate max-w-[140px]">
                {transactionId}
              </span>
            </div>
            <div className="border-t border-gray-100 dark:border-[#2A2D32] pt-2 flex justify-between text-sm font-extrabold text-gray-900 dark:text-white">
              <span>Amount Paid</span>
              <span className="text-orange-600 dark:text-orange-400">₹{formattedTotal}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address Summary Card */}
        <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span>Shipping Address</span>
          </h2>
          {addr ? (
            <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
              <p className="font-bold text-gray-900 dark:text-white">{addr.full_name}</p>
              <p>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
              <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
              <p>{addr.country}</p>
              <p className="text-gray-500 pt-1">Phone: {addr.phone}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Address details unavailable.</p>
          )}
        </div>
      </div>

      {/* Ordered Items List */}
      <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          <span>Items Ordered ({order.items?.length || 0})</span>
        </h2>

        <div className="divide-y divide-gray-100 dark:divide-[#2A2D32]">
          {order.items?.map((item) => {
            const unitPriceFormatted = parseFloat(item.unit_price || 0).toLocaleString('en-IN');
            const subtotalFormatted = parseFloat(item.subtotal || 0).toLocaleString('en-IN');

            return (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.product_name}</p>
                  <p className="text-gray-500">Qty: {item.quantity} × ₹{unitPriceFormatted}</p>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  ₹{subtotalFormatted}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <Link
          to={`/orders/${order.order_number}`}
          className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/20 transition-all text-center flex items-center justify-center gap-2"
        >
          <span>View Order Details</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/products"
          className="w-full sm:w-auto px-8 py-3.5 bg-gray-100 dark:bg-[#2A2D32] hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm rounded-xl transition-all text-center flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>
    </div>
  );
}

export default OrderSuccessPage;
