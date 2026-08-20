import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { adminApi } from '../../api/adminApi';
import { ArrowLeft, Save, Plus, Upload, Check, Edit, ExternalLink } from 'lucide-react';

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: '',
    brand_id: '',
    is_active: true,
  });

  // Existing Product state if editing
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Variant Modal / Form state
  const [variantForm, setVariantForm] = useState({
    sku: '',
    name: '',
    price: '',
    discount_price: '',
    initial_stock: '0',
  });

  // Edit Variant state
  const [editingVariant, setEditingVariant] = useState(null);
  const [editVariantForm, setEditVariantForm] = useState({
    sku: '',
    name: '',
    price: '',
    discount_price: '',
  });

  // Image Upload state
  const [imageFile, setImageFile] = useState(null);
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    fetchOptions();
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchOptions = async () => {
    try {
      const [cats, brs] = await Promise.all([adminApi.getCategories(), adminApi.getBrands()]);
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error('Failed to load categories/brands:', err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getProduct(id);
      setProduct(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        category_id: data.category?.id || '',
        brand_id: data.brand?.id || '',
        is_active: data.is_active ?? true,
      });
    } catch (err) {
      console.error('Failed to load product detail:', err);
      setError('Product not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  // Filter available brands by selected category
  const availableBrands = formData.category_id
    ? brands.filter((b) => {
        const catIds = b.categories || b.categories_detail?.map((c) => c.id) || [];
        return catIds.length === 0 || catIds.includes(parseInt(formData.category_id, 10));
      })
    : brands;

  const handleCategoryChange = (e) => {
    const selectedCatId = e.target.value;
    const newAvailableBrands = selectedCatId
      ? brands.filter((b) => {
          const catIds = b.categories || b.categories_detail?.map((c) => c.id) || [];
          return catIds.length === 0 || catIds.includes(parseInt(selectedCatId, 10));
        })
      : brands;

    const brandIsStillValid = newAvailableBrands.some((b) => String(b.id) === String(formData.brand_id));

    setFormData((prev) => ({
      ...prev,
      category_id: selectedCatId,
      brand_id: brandIsStillValid ? prev.brand_id : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const catVal = formData.category_id ? parseInt(formData.category_id, 10) : null;
      const brandVal = formData.brand_id ? parseInt(formData.brand_id, 10) : null;

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description,
        category: catVal,
        category_id: catVal,
        brand: brandVal,
        brand_id: brandVal,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await adminApi.updateProduct(id, payload);
        alert('Product updated successfully!');
        await fetchProduct();
      } else {
        const created = await adminApi.createProduct(payload);
        alert('Product created! You can now add variants and upload images.');
        navigate(`/admin/products/${created.id}/edit`);
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          const fieldMsgs = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field.toUpperCase()}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          setError(fieldMsgs || 'Failed to save product.');
        }
      } else {
        setError('Failed to save product. Please check your network connection.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!isEditing) return;
    try {
      await adminApi.createVariant(id, {
        sku: variantForm.sku.trim(),
        name: variantForm.name.trim(),
        price: parseFloat(variantForm.price),
        discount_price: variantForm.discount_price ? parseFloat(variantForm.discount_price) : null,
        initial_stock: variantForm.initial_stock !== '' ? parseInt(variantForm.initial_stock, 10) : 0,
      });
      setVariantForm({ sku: '', name: '', price: '', discount_price: '', initial_stock: '0' });
      await fetchProduct();
    } catch (err) {
      console.error('Failed to add variant:', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          alert(err.response.data);
        } else if (err.response.data.detail) {
          alert(err.response.data.detail);
        } else {
          const msgs = Object.entries(err.response.data)
            .map(([field, errors]) => `${field.toUpperCase()}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          alert(msgs || 'Failed to create variant.');
        }
      } else {
        alert('Failed to create variant.');
      }
    }
  };

  const handleOpenEditVariant = (v) => {
    setEditingVariant(v);
    setEditVariantForm({
      sku: v.sku || '',
      name: v.name || '',
      price: v.price || '',
      discount_price: v.discount_price || '',
    });
  };

  const handleSaveVariantEdit = async (e) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await adminApi.updateVariant(id, editingVariant.id, {
        sku: editVariantForm.sku.trim(),
        name: editVariantForm.name.trim(),
        price: parseFloat(editVariantForm.price),
        discount_price: editVariantForm.discount_price ? parseFloat(editVariantForm.discount_price) : null,
      });
      setEditingVariant(null);
      await fetchProduct();
    } catch (err) {
      console.error('Failed to update variant:', err);
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          alert(err.response.data);
        } else if (err.response.data.detail) {
          alert(err.response.data.detail);
        } else {
          const msgs = Object.entries(err.response.data)
            .map(([field, errors]) => `${field.toUpperCase()}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          alert(msgs || 'Failed to update variant.');
        }
      } else {
        alert('Failed to update variant.');
      }
    }
  };

  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!isEditing || !imageFile) return;
    try {
      const data = new FormData();
      data.append('image', imageFile);
      data.append('is_primary', isPrimary ? 'true' : 'false');
      await adminApi.uploadImage(id, data);
      setImageFile(null);
      setIsPrimary(false);
      fetchProduct();
    } catch (err) {
      alert('Failed to upload image.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
          {isEditing ? 'Edit Product & Variants' : 'Add New Product'}
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Product Details Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            1. General Product Details
          </h2>
          {isEditing && (
            <span className="text-xs font-semibold px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-full border border-orange-200 dark:border-orange-900">
              {product?.variant_count ?? product?.variants?.length ?? 0} variants · {product?.total_stock ?? 0} units
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
              placeholder="e.g. Wireless Noise-Cancelling Headphones"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Slug (URL Keyword)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
              placeholder="Auto-generated if left blank"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category *</label>
            <select
              value={formData.category_id}
              onChange={handleCategoryChange}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Brand</label>
            <select
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="">No Brand</option>
              {availableBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500"
            placeholder="Product details, specs, feature bullet points..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Active in Catalog (Visible to customers)
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors shadow-md shadow-orange-600/20 text-sm"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Save & Continue'}
          </button>
        </div>
      </form>

      {/* If editing: Variant & Image Managers */}
      {isEditing && (
        <>
          {/* Variants Section */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                2. Product Variants & INR (₹) Pricing
              </h2>
              <Link
                to="/admin/inventory"
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Adjust Stock in Inventory
              </Link>
            </div>

            {/* List Existing Variants */}
            {product?.variants?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">Variant Name</th>
                      <th className="px-4 py-2.5">Regular Price</th>
                      <th className="px-4 py-2.5">Sale Price</th>
                      <th className="px-4 py-2.5">Stock</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {product.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="px-4 py-2.5 font-mono font-semibold text-gray-900 dark:text-white">{v.sku}</td>
                        <td className="px-4 py-2.5">{v.name}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                          ₹{parseFloat(v.price).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">
                          {v.discount_price ? `₹${parseFloat(v.discount_price).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-bold">{v.inventory?.quantity ?? 0}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVariant(v)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-orange-600"
                            title="Edit Variant Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Variant Sub-form */}
            <form onSubmit={handleAddVariant} className="bg-gray-50 dark:bg-[#1A1C1E] p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Add New Variant
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  type="text"
                  required
                  placeholder="SKU (e.g. WH-BLACK-01)"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  className="px-3 py-2 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                />
                <input
                  type="text"
                  required
                  placeholder="Name (e.g. Black / 64GB)"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  className="px-3 py-2 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Price in INR (₹)"
                  value={variantForm.price}
                  onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                  className="px-3 py-2 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Discount Price (₹)"
                  value={variantForm.discount_price}
                  onChange={(e) => setVariantForm({ ...variantForm, discount_price: e.target.value })}
                  className="px-3 py-2 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Initial Stock (e.g. 25)"
                  value={variantForm.initial_stock}
                  onChange={(e) => setVariantForm({ ...variantForm, initial_stock: e.target.value })}
                  className="px-3 py-2 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg"
              >
                <Plus className="w-4 h-4" /> Add Variant
              </button>
            </form>
          </div>

          {/* Edit Variant Modal */}
          {editingVariant && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#16181A] max-w-md w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Edit Variant details ({editingVariant.sku})
                </h3>

                <form onSubmit={handleSaveVariantEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
                    <input
                      type="text"
                      required
                      value={editVariantForm.sku}
                      onChange={(e) => setEditVariantForm({ ...editVariantForm, sku: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Variant Name *</label>
                    <input
                      type="text"
                      required
                      value={editVariantForm.name}
                      onChange={(e) => setEditVariantForm({ ...editVariantForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Regular Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editVariantForm.price}
                      onChange={(e) => setEditVariantForm({ ...editVariantForm, price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Discount Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editVariantForm.discount_price}
                      onChange={(e) => setEditVariantForm({ ...editVariantForm, discount_price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingVariant(null)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow"
                    >
                      Save Variant
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Images Section */}
          <div className="bg-white dark:bg-[#121315] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
              3. Product Images
            </h2>

            {/* Display Images */}
            {product?.images?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group bg-gray-50 dark:bg-[#1A1C1E]"
                  >
                    <img src={img.image} alt="Product" className="w-full h-32 object-cover" />
                    {img.is_primary && (
                      <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload Sub-form */}
            <form onSubmit={handleUploadImage} className="bg-gray-50 dark:bg-[#1A1C1E] p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Upload Image
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="text-xs text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 dark:file:bg-orange-950/40 dark:file:text-orange-400"
                />
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="rounded text-orange-600"
                  />
                  Set as Primary Image
                </label>
                <button
                  type="submit"
                  disabled={!imageFile}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminProductFormPage;
