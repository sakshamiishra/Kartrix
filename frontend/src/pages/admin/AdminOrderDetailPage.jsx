import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { adminApi } from '../../api/adminApi';
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

export function AdminOrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Status transition state
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Refund recording state
  const [refundNote, setRefundNote] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOrder(orderNumber);
      setOrder(data);
      setNewStatus(data.status);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!newStatus || newStatus === order.status) return;
    try {
      setUpdating(true);
      await adminApi.updateOrderStatus(orderNumber, {
        status: newStatus,
        note: statusNote,
      });
      alert('Order status updated!');
      setStatusNote('');
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmCod = async () => {
    if (!window.confirm('Confirm COD Cash Payment Received for this order?')) return;
    try {
      setUpdating(true);
      await adminApi.confirmCodPayment(orderNumber);
      alert('COD Payment marked as PAID!');
      fetchOrder();
    } catch (err) {
      alert('Failed to confirm COD payment.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordRefund = async (e) => {
    e.preventDefault();
    if (!order.payment?.id) return;
    try {
      setUpdating(true);
      await adminApi.recordRefund(order.payment.id, { note: refundNote });
      alert('Payment status updated to REFUNDED (DB Audit Record).');
      setShowRefundModal(false);
      setRefundNote('');
      fetchOrder();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record refund.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return <div className="p-6 text-center text-gray-500">Order not found.</div>;
  }

  // Next valid statuses map
  const allowedTransitions = {
    PLACED: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED'],
    SHIPPED: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: ['RETURNED'],
    CANCELLED: [],
    RETURNED: [],
  };

  const validNextStatuses = allowedTransitions[order.status] || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders List
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-extrabold text-gray-900 dark:text-white">
            Order #{order.order_number}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Breakdown & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Control Box */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
              <span>Order Status & Transitions</span>
              <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 font-extrabold">
                Current: {order.status}
              </span>
            </h2>

            {validNextStatuses.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                This order is in terminal state ({order.status}). No further status transitions are allowed.
              </p>
            ) : (
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Transition to Next Status *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold"
                  >
                    <option value={order.status}>Select Next Status...</option>
                    {validNextStatuses.map((st) => (
                      <option key={st} value={st}>
                        Transition to {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Audit Log Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dispatched via courier AWB #98765"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating || newStatus === order.status}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  Update Order Status
                </button>
              </form>
            )}

            {/* COD & Payment Actions */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
              {order.payment?.payment_method === 'COD' && order.payment_status !== 'PAID' && (
                <button
                  onClick={handleConfirmCod}
                  disabled={updating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Confirm COD Payment Received
                </button>
              )}

              {order.payment?.status === 'PAID' && (
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-red-600 hover:text-white text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" /> Record Manual Refund (DB Audit)
                </button>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
              Order Items ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {order.items?.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.product_name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} × ₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="font-extrabold text-gray-900 dark:text-white">
                    ₹{parseFloat(item.subtotal).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1 text-right text-sm">
              <p className="text-xs text-gray-500">Subtotal: ₹{parseFloat(order.subtotal).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-500">Shipping: ₹{parseFloat(order.shipping_cost).toLocaleString('en-IN')}</p>
              <p className="text-base font-extrabold text-gray-900 dark:text-white pt-1">
                Total Amount: ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Timeline */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-600" /> Customer Information
            </h3>
            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
              <p className="font-semibold text-gray-900 dark:text-white">{order.address_detail?.full_name || 'Customer'}</p>
              <p>{order.user_email || order.user}</p>
              <p>Phone: {order.address_detail?.phone || 'N/A'}</p>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" /> Shipping Address
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p>{order.shipping_address_snapshot?.address_line_1}</p>
              <p>{order.shipping_address_snapshot?.city}, {order.shipping_address_snapshot?.state} {order.shipping_address_snapshot?.postal_code}</p>
              <p>{order.shipping_address_snapshot?.country}</p>
            </div>
          </div>

          {/* Status History Timeline */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" /> Audit Status Timeline
            </h3>

            <div className="space-y-3">
              {order.status_history?.map((hist) => (
                <div key={hist.id} className="border-l-2 border-orange-500 pl-3 py-1 space-y-0.5 text-xs">
                  <p className="font-bold text-gray-900 dark:text-white">{hist.status}</p>
                  <p className="text-gray-500">{hist.note}</p>
                  <p className="text-[10px] text-gray-400">{new Date(hist.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Record Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16181A] max-w-md w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Record Manual Refund (DB Audit Record)
            </h3>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Disclaimer
              </p>
              <p>
                Marking a payment as REFUNDED updates the internal Kartrix audit log. This action does NOT trigger an automated payout via Razorpay API.
              </p>
            </div>

            <form onSubmit={handleRecordRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Audit Note / Reason
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Returned item inspected; refund issued via bank transfer"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow"
                >
                  {updating ? 'Recording...' : 'Record Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrderDetailPage;
