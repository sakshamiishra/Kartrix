import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Ticket, Plus, Edit, Trash2 } from 'lucide-react';

export function AdminCouponPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    minimum_order_amount: '0.00',
    is_active: true,
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCoupons();
      setCoupons(data.results || data);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await adminApi.updateCoupon(editingId, form);
      } else {
        await adminApi.createCoupon(form);
      }
      setForm({
        code: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: '',
        minimum_order_amount: '0.00',
        is_active: true,
      });
      setEditingId(null);
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.code || 'Failed to save coupon.');
    }
  };

  const handleEdit = (cp) => {
    setEditingId(cp.id);
    setForm({
      code: cp.code,
      description: cp.description || '',
      discount_type: cp.discount_type,
      discount_value: cp.discount_value,
      minimum_order_amount: cp.minimum_order_amount || '0.00',
      is_active: cp.is_active,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete coupon code?')) return;
    try {
      await adminApi.deleteCoupon(id);
      fetchCoupons();
    } catch (err) {
      alert('Failed to delete coupon.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Promotional Coupons Manager
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Create, edit, and toggle discount promo codes in INR (₹) or percentage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coupon Form */}
        <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {editingId ? 'Edit Coupon' : 'Create New Coupon'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-mono font-bold uppercase"
                placeholder="e.g. FESTIVE20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-xs"
                >
                  <option value="PERCENTAGE">PERCENTAGE (%)</option>
                  <option value="FIXED_AMOUNT">FIXED AMOUNT (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Value *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15 or 250"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min Order Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={form.minimum_order_amount}
                onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cp_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded text-orange-600"
              />
              <label htmlFor="cp_active" className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Active Code
              </label>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
              >
                {editingId ? 'Update Coupon' : 'Create Coupon'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      code: '',
                      description: '',
                      discount_type: 'PERCENTAGE',
                      discount_value: '',
                      minimum_order_amount: '0.00',
                      is_active: true,
                    });
                  }}
                  className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Coupons Table */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No coupons found.</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Min Order</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {coupons.map((cp) => (
                  <tr key={cp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-900 dark:text-white">{cp.code}</td>
                    <td className="px-5 py-3.5 font-semibold text-orange-600">
                      {cp.discount_type === 'PERCENTAGE' ? `${cp.discount_value}% OFF` : `₹${cp.discount_value} OFF`}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">₹{cp.minimum_order_amount}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          cp.is_active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {cp.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button onClick={() => handleEdit(cp)} className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-orange-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cp.id)} className="p-1.5 text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminCouponPage;
