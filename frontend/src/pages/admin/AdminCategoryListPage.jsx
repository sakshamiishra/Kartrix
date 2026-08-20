import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { adminApi } from '../../api/adminApi';
import { FolderTree, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

export function AdminCategoryListPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [editingId, setEditingId] = useState(null);

  // Blocked Delete Modal state
  const [blockedDeleteModal, setBlockedDeleteModal] = useState({
    isOpen: false,
    categoryId: null,
    categoryName: '',
    message: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, form);
      } else {
        await adminApi.createCategory(form);
      }
      setForm({ name: '', slug: '', description: '' });
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.name || 'Failed to save category.');
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '' });
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteCategory(cat.id);
      fetchCategories();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail) {
        setBlockedDeleteModal({
          isOpen: true,
          categoryId: cat.id,
          categoryName: cat.name,
          message: err.response.data.detail,
        });
      } else {
        alert('Failed to delete category.');
      }
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Categories Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Organize store products into logical catalog categories.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Form */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="e.g. Smart Electronics"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="Auto-generated if left empty"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  {editingId ? 'Update Category' : 'Create Category'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ name: '', slug: '', description: '' });
                    }}
                    className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories Table */}
          <div className="lg:col-span-2 bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No categories found.</div>
            ) : (
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Slug</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">{cat.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{cat.slug}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-orange-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
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
              <span>Cannot Delete Category</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {blockedDeleteModal.message}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setBlockedDeleteModal({ isOpen: false, categoryId: null, categoryName: '', message: '' })}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cId = blockedDeleteModal.categoryId;
                  setBlockedDeleteModal({ isOpen: false, categoryId: null, categoryName: '', message: '' });
                  navigate(`/admin/products?category=${cId}`);
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

export default AdminCategoryListPage;
