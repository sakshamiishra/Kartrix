import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Star, Trash2, Edit, Check, X, Building, Globe, Phone } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useToast } from '../context/ToastContext';

export const AddressPage = () => {
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await authApi.getAddresses();
      setAddresses(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error loading addresses:', err);
      showToast('Failed to load shipping addresses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({
      full_name: '',
      phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setFormData({
      full_name: addr.full_name || '',
      phone: addr.phone || '',
      address_line_1: addr.address_line_1 || '',
      address_line_2: addr.address_line_2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postal_code: addr.postal_code || '',
      country: addr.country || 'India',
      is_default: addr.is_default || false,
    });
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAddress) {
        await authApi.updateAddress(editingAddress.id, formData);
        showToast('Address updated successfully!', 'success');
      } else {
        await authApi.createAddress(formData);
        showToast('Address added successfully!', 'success');
      }
      setModalOpen(false);
      fetchAddresses();
    } catch (err) {
      console.error('Error saving address:', err);
      showToast('Failed to save address details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await authApi.deleteAddress(id);
      showToast('Address deleted.', 'info');
      fetchAddresses();
    } catch (err) {
      console.error('Error deleting address:', err);
      showToast('Failed to delete address.', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await authApi.setDefaultAddress(id);
      showToast('Default address updated!', 'success');
      fetchAddresses();
    } catch (err) {
      console.error('Error setting default address:', err);
      showToast('Failed to set default address.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2A2D32]">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Shipping Addresses
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage your delivery destinations and primary default shipping address
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] space-y-3">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Addresses Saved Yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add a shipping address to get started with fast delivery.</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Address Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`relative bg-white dark:bg-[#17191B] rounded-3xl border p-6 shadow-sm transition-all space-y-4 flex flex-col justify-between ${
                addr.is_default
                  ? 'border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-gray-100 dark:border-[#2A2D32]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {addr.full_name}
                  </span>
                  {addr.is_default ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      Default Address
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {addr.address_line_1}
                  {addr.address_line_2 && `, ${addr.address_line_2}`}
                  <br />
                  {addr.city}, {addr.state} - {addr.postal_code}
                  <br />
                  {addr.country}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{addr.phone}</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#2A2D32]">
                <button
                  onClick={() => openEditModal(addr)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-[#0F1011] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          ></div>

          <div className="relative bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] max-w-lg w-full p-6 shadow-2xl space-y-6 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#2A2D32]">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingAddress ? 'Edit Shipping Address' : 'Add Shipping Address'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#0F1011]">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Address Line 1
                </label>
                <input
                  type="text"
                  required
                  placeholder="123 Main Street, Apt 4B"
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Near Landmark / Business Park"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="400001"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Country
                </label>
                <input
                  type="text"
                  required
                  placeholder="India"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Set as default shipping address</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 mt-2"
              >
                {submitting ? 'Saving Address...' : 'Save Shipping Address'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
