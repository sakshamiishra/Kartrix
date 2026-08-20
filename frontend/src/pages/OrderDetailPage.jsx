import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Package, MapPin, Clock, ArrowLeft, ShieldCheck, CheckCircle2, CreditCard, Loader2, MessageSquarePlus } from 'lucide-react';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { reviewApi } from '../api/reviewApi';
import { ReviewFormModal } from '../components/products/ReviewFormModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Review modal state for order items
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

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

  useEffect(() => {
    fetchOrderDetail();
  }, [orderNumber]);

  const handleRetryPayment = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        addToast('Razorpay SDK failed to load. Check your internet connection.', 'error');
        setPaying(false);
        return;
      }

      const initData = await paymentApi.createRazorpayOrder({ order_number: order.order_number });

      const options = {
        key: initData.key_id,
        amount: initData.amount,
        currency: initData.currency,
        name: 'Kartrix',
        description: `Order #${order.order_number}`,
        order_id: initData.gateway_order_id,
        handler: async function (response) {
          try {
            const verifyRes = await paymentApi.verifyRazorpayPayment({
              order_number: order.order_number,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            const successOrderNumber = verifyRes.order_number || order.order_number;
            addToast(`Payment successful! Order #${successOrderNumber} confirmed.`, 'success');
            navigate(`/order-success/${successOrderNumber}`);
          } catch (verifyErr) {
            const msg = verifyErr.response?.data?.detail || 'Payment verification failed.';
            addToast(msg, 'error');
            fetchOrderDetail();
          } finally {
            setPaying(false);
          }
        },

        prefill: {
          name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          email: user?.email || '',
        },
        theme: {
          color: '#F56A00',
        },
        modal: {
          ondismiss: function () {
            addToast('Razorpay checkout closed.', 'info');
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        addToast(`Payment failed: ${resp.error?.description || 'Transaction declined.'}`, 'error');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to initialize payment.';
      addToast(msg, 'error');
      setPaying(false);
    }
  };

  const handleOpenReviewModalForItem = (item) => {
    setSelectedReviewItem(item);
    setReviewModalOpen(true);
  };

  const handleSubmitReviewForItem = async (formData) => {
    if (!selectedReviewItem || !selectedReviewItem.product) return;
    setSubmittingReview(true);
    try {
      const payload = new FormData();
      payload.append('product', selectedReviewItem.product);
      payload.append('rating', formData.rating);
      payload.append('title', formData.title || '');
      payload.append('comment', formData.comment || '');
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((img) => payload.append('uploaded_images', img));
      }

      await reviewApi.createReview(payload);
      addToast(`Thank you! Your review for ${selectedReviewItem.product_name} has been submitted.`, 'success');
      setReviewModalOpen(false);
      setSelectedReviewItem(null);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to submit review.';
      addToast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

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

  const isPaid = order.payment_status === 'PAID';
  const isPendingPayment = order.payment_status === 'PENDING';
  const isRazorpayMethod = (order.payment?.payment_method || 'RAZORPAY') === 'RAZORPAY';
  const isCancellable = order.status === 'PLACED' || order.status === 'CONFIRMED';
  const isDeliveredAndPaid = order.status === 'DELIVERED' && isPaid;

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await orderApi.cancelOrder(order.order_number);
      addToast(`Order #${order.order_number} cancelled successfully.`, 'success');
      setCancelModalOpen(false);
      await fetchOrderDetail();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to cancel order.';
      addToast(msg, 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Navigation & Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-[#2A2D32] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Order #{order.order_number}</h1>
            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
              order.status === 'CANCELLED'
                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                : isPaid
                ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
            }`}>
              {order.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Placed on {createdDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isCancellable && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-xl transition-all"
            >
              Cancel Order
            </button>
          )}

          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Orders</span>
          </Link>
        </div>
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
              <span className={`font-bold uppercase ${
                isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {order.payment_status}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Method</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {order.payment?.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'Razorpay Online'}
              </span>
            </div>
            {order.payment?.transaction_id && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Txn ID</span>
                <span className="font-mono text-[10px] text-gray-900 dark:text-white truncate max-w-[120px]">
                  {order.payment.transaction_id}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-white">₹{formattedSubtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
              <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
            </div>
            <div className="border-t border-gray-100 dark:border-[#2A2D32] pt-2 flex justify-between text-sm font-extrabold text-gray-900 dark:text-white">
              <span>Total Amount</span>
              <span className="text-orange-600 dark:text-orange-400">₹{formattedTotal}</span>
            </div>
          </div>

          {/* Retry Payment Button (Razorpay only) */}
          {isPendingPayment && isRazorpayMethod && order.status !== 'CANCELLED' && (
            <button
              onClick={handleRetryPayment}
              disabled={paying}
              className="w-full mt-2 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Now via Razorpay</span>
                </>
              )}
            </button>
          )}
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
              <div key={item.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.product_name}</p>
                  <p className="text-xs text-gray-500">
                    Quantity: {item.quantity} × ₹{unitPriceFormatted}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">₹{itemSubtotalFormatted}</span>
                  </div>

                  {isDeliveredAndPaid && item.product && (
                    <button
                      onClick={() => handleOpenReviewModalForItem(item)}
                      className="px-3.5 py-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Review Product</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Status History */}
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

      {/* Cancel Order Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancel Order #{order.order_number}?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to cancel this order? Item stock will be restored and this action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
              >
                No, Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Order</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal for Order Items */}
      <ReviewFormModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleSubmitReviewForItem}
        productName={selectedReviewItem?.product_name || ''}
        loading={submittingReview}
      />
    </div>
  );
}

export default OrderDetailPage;
