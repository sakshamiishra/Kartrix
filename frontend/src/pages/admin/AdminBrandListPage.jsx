import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { adminApi } from '../../api/adminApi';
import { Tag, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

export function AdminBrandListPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', description: '', categories: [] });
  const [editingId, setEditingId] = useState(null);

  // Blocked Delete Modal state
  const [blockedDeleteModal, setBlockedDeleteModal] = useState({
    isOpen: false,
    brandId: null,
    brandName: '',
    message: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bData, cData] = await Promise.all([adminApi.getBrands(), adminApi.getCategories()]);
      setBrands(bData);
      setCategories(cData);
    } catch (err) {
      console.error('Failed to fetch brands or categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (catId) => {
    setForm((prev) => {
      const exists = prev.categories.includes(catId);
      if (exists) {
        return { ...prev, categories: prev.categories.filter((id) => id !== catId) };
      } else {
        return { ...prev, categories: [...prev.categories, catId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description,
        categories: form.categories,
      };

      if (editingId) {
        await adminApi.updateBrand(editingId, payload);
      } else {
        await adminApi.createBrand(payload);
      }
      setForm({ name: '', slug: '', description: '', categories: [] });
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.name || err.response?.data?.categories || 'Failed to save brand.');
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    const catIds = b.categories || b.categories_detail?.map((c) => c.id) || [];
    setForm({
      name: b.name,
      slug: b.slug,
      description: b.description || '',
      categories: catIds,
    });
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete brand "${b.name}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteBrand(b.id);
      fetchData();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail) {
        setBlockedDeleteModal({
          isOpen: true,
          brandId: b.id,
          brandName: b.name,
          message: err.response.data.detail,
        });
      } else {
        alert('Failed to delete brand.');
      }
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Brands Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage manufacturer and vendor brand identities and associate them across catalog categories.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brand Form */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {editingId ? 'Edit Brand' : 'Create Brand'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="e.g. Sony, Apple, Samsung"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Associated Categories</label>
                <div className="max-h-36 overflow-y-auto p-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5 text-xs">
                  {categories.length === 0 ? (
                    <p className="text-gray-400">No categories created yet.</p>
                  ) : (
                    categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={form.categories.includes(cat.id)}
                          onChange={() => handleCategoryToggle(cat.id)}
                          className="rounded text-orange-600 focus:ring-orange-500"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="Brief brand bio..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  {editingId ? 'Update Brand' : 'Create Brand'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ name: '', slug: '', description: '', categories: [] });
                    }}
                    className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Brands Table */}
          <div className="lg:col-span-2 bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : brands.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No brands found.</div>
            ) : (
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Associated Categories</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {brands.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">
                        <div>{b.name}</div>
                        <div className="font-mono text-[11px] text-gray-400 font-normal">{b.slug}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {b.categories_detail?.length > 0
                          ? b.categories_detail.map((c) => c.name).join(', ')
                          : 'All Categories'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(b)}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-orange-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b)}
                          className="p-1.5 text-red-500 hover:text-red-700"
                        >
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

      {/* Blocked Deletion Dialog Modal */}
      {blockedDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16181A] max-w-md w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold text-lg border-b border-gray-100 dark:border-gray-800 pb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Cannot Delete Brand</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {blockedDeleteModal.message}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setBlockedDeleteModal({ isOpen: false, brandId: null, brandName: '', message: '' })}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bId = blockedDeleteModal.brandId;
                  setBlockedDeleteModal({ isOpen: false, brandId: null, brandName: '', message: '' });
                  navigate(`/admin/products?brand=${bId}`);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
              >
                View Products
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminBrandListPage;
