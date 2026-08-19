import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { MapPin, Plus, CheckCircle, ShoppingBag, ShieldCheck, ArrowLeft, Loader2, CreditCard, Banknote } from 'lucide-react';
import { authApi } from '../api/authApi';
import { orderApi } from '../api/orderApi';
import { paymentApi } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
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

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSubtotal, fetchCart } = useCart();
  const { addToast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const paymentCompletedRef = React.useRef(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const data = await authApi.getAddresses();
        setAddresses(data);
        if (data.length > 0) {
          const defaultAddr = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (err) {
        addToast('Failed to load shipping addresses.', 'error');
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchAddresses();
  }, []);

  if (cartItems.length === 0 && !submitting) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto text-orange-600 dark:text-orange-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Cart is Empty</h2>
        <p className="text-gray-500 dark:text-gray-400">You must add items to your cart before proceeding to checkout.</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Products</span>
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      addToast('Please select a shipping address.', 'error');
      return;
    }

    paymentCompletedRef.current = false;
    setSubmitting(true);

    try {
      // Step 1: Create local Order
      const order = await orderApi.checkout({ address_id: selectedAddressId, payment_method: paymentMethod });

      if (paymentMethod === 'RAZORPAY') {
        // Step 2: Load Razorpay Checkout JS SDK
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          addToast('Razorpay SDK failed to load. Check your internet connection.', 'error');
          await fetchCart();
          navigate(`/orders/${order.order_number}`);
          setSubmitting(false);
          return;
        }

        // Step 3: Initialize Razorpay order on backend
        const initData = await paymentApi.createRazorpayOrder({ order_number: order.order_number });

        // Step 4: Open Razorpay modal
        const options = {
          key: initData.key_id,
          amount: initData.amount,
          currency: initData.currency,
          name: 'EasyKart',
          description: `Order #${order.order_number}`,
          order_id: initData.gateway_order_id,
          handler: async function (response) {
            paymentCompletedRef.current = true;
            try {
              const verifyRes = await paymentApi.verifyRazorpayPayment({
                order_number: order.order_number,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              const successOrderNumber = verifyRes?.order_number || order.order_number;

              try {
                addToast(`Payment successful! Order #${successOrderNumber} confirmed.`, 'success');
              } catch (toastErr) {
              }

              navigate(`/order-success/${successOrderNumber}`);

              fetchCart().catch(() => {});
            } catch (err) {
              paymentCompletedRef.current = false;
              const msg = err.response?.data?.detail || err.message || 'Payment verification failed.';
              try {
                addToast(msg, 'error');
              } catch (_) {}
              navigate(`/orders/${order.order_number}`);
              fetchCart().catch(() => {});
              setSubmitting(false);
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
              if (paymentCompletedRef.current) {
                return;
              }
              try {
                addToast('Razorpay checkout closed without completing payment. You can retry from Order Details.', 'info');
              } catch (_) {}
              navigate(`/orders/${order.order_number}`);
              fetchCart().catch(() => {});
              setSubmitting(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          if (paymentCompletedRef.current) return;
          try {
            addToast(`Payment failed: ${resp.error?.description || 'Transaction declined.'}`, 'error');
          } catch (_) {}
          navigate(`/orders/${order.order_number}`);
          fetchCart().catch(() => {});
          setSubmitting(false);
        });
        rzp.open();

      } else {
        // Fallback or COD flow
        paymentCompletedRef.current = true;
        addToast(`Order #${order.order_number} placed successfully!`, 'success');
        navigate(`/order-success/${order.order_number}`);
        fetchCart().catch(() => {});
      }

    } catch (err) {
      console.error('[Checkout] place order error:', err);
      const msg = err.response?.data?.detail || 'Failed to place order. Please try again.';
      addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      setSubmitting(false);
    }
  };


  const formattedSubtotal = parseFloat(cartSubtotal || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2A2D32] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">Checkout</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select your shipping address and review your order.</p>
        </div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cart</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Address & Payment Method Selection */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <span>Shipping Address</span>
              </h2>
              <Link
                to="/addresses"
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </Link>
            </div>

            {loadingAddresses ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading shipping addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="py-8 text-center space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">No saved shipping addresses found.</p>
                <Link
                  to="/addresses"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Shipping Address</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-500/50 shadow-sm'
                          : 'border-gray-200 dark:border-[#2A2D32] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{addr.full_name}</span>
                          {addr.is_default && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                          {addr.address_line_1}
                          {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          {addr.city}, {addr.state} - {addr.postal_code}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Phone: {addr.phone}</p>
                      </div>
                      <div className="pt-1">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span>Payment Method</span>
            </h2>

            <div className="space-y-3">
              {/* Razorpay Option */}
              <div
                onClick={() => setPaymentMethod('RAZORPAY')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-500/50 shadow-sm'
                    : 'border-gray-200 dark:border-[#2A2D32] hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">Razorpay Online Payment</p>
                    <p className="text-xs text-gray-500">UPI, Credit/Debit Cards, Netbanking, Wallets (Test Mode)</p>
                  </div>
                </div>
                {paymentMethod === 'RAZORPAY' ? (
                  <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>

              {/* COD Option (Disabled or Info Badge) */}
              <div
                className="p-4 rounded-2xl border border-gray-200 dark:border-[#2A2D32] opacity-60 cursor-not-allowed flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#0F1011] text-gray-400 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">Cash on Delivery (COD)</p>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                        Phase 8B
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Pay cash upon delivery</p>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700" />
              </div>
            </div>
          </div>

          {/* Delivery Method Notice */}
          <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-3 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Delivery Method</h2>
            <div className="p-3 bg-gray-50 dark:bg-[#0F1011] rounded-xl border border-gray-100 dark:border-[#2A2D32] flex justify-between items-center text-sm">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Standard Delivery</p>
                <p className="text-xs text-gray-500">Delivered within 3-5 business days</p>
              </div>
              <span className="font-bold text-green-600 dark:text-green-400">FREE</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Review & Place Order */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              <span>Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
            </h2>

            {/* Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cartItems.map((item) => {
                const imgUrl = item.product_detail?.primary_image || item.product_detail?.images?.[0]?.image;
                const unitPriceFormatted = parseFloat(item.unit_price || 0).toLocaleString('en-IN');
                const subtotalFormatted = parseFloat(item.subtotal || 0).toLocaleString('en-IN');

                return (
                  <div key={item.id} className="flex gap-3 py-2 border-b border-gray-100 dark:border-[#2A2D32] last:border-none">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#0F1011] flex-shrink-0 overflow-hidden border border-gray-200 dark:border-[#2A2D32]">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.product_detail?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{item.product_detail?.name}</p>
                      <p className="text-gray-500">Qty: {item.quantity} × ₹{unitPriceFormatted}</p>
                    </div>
                    <div className="text-right text-xs font-bold text-gray-900 dark:text-white">
                      ₹{subtotalFormatted}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 border-t border-b border-gray-100 dark:border-[#2A2D32] py-4 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{formattedSubtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Shipping</span>
                <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-extrabold text-gray-900 dark:text-white">
              <span>Total Payable</span>
              <span className="text-xl text-orange-600 dark:text-orange-400">₹{formattedSubtotal}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || addresses.length === 0}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <span>Pay ₹{formattedSubtotal} via Razorpay</span>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 justify-center pt-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>100% Safe & Secure Razorpay Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
