import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { adminApi } from '../../api/adminApi';
import { Package, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Filter, X } from 'lucide-react';

export function AdminProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const brandParam = searchParams.get('brand');
  const categoryParam = searchParams.get('category');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [filterEntityName, setFilterEntityName] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [brandParam, categoryParam]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (brandParam) params.brand = brandParam;
      if (categoryParam) params.category = categoryParam;

      const data = await adminApi.getProducts(params);
      setProducts(data.results || data);

      // Fetch name of filtered entity if parameter is present
      if (brandParam) {
        try {
          const brands = await adminApi.getBrands();
          const match = brands.find((b) => String(b.id) === String(brandParam));
          setFilterEntityName(match ? `Brand: ${match.name}` : `Brand ID #${brandParam}`);
        } catch {
          setFilterEntityName(`Brand ID #${brandParam}`);
        }
      } else if (categoryParam) {
        try {
          const categories = await adminApi.getCategories();
          const match = categories.find((c) => String(c.id) === String(categoryParam));
          setFilterEntityName(match ? `Category: ${match.name}` : `Category ID #${categoryParam}`);
        } catch {
          setFilterEntityName(`Category ID #${categoryParam}`);
        }
      } else {
        setFilterEntityName('');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilter = () => {
    setSearchParams({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this product?')) return;
    try {
      await adminApi.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (filterActive === 'active') return matchesSearch && p.is_active;
    if (filterActive === 'inactive') return matchesSearch && !p.is_active;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Products Catalog
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your store items, price points in INR (₹), product variants, and stock catalog.
          </p>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-orange-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Active Filter Banner when navigated from Brand/Category blocked deletion */}
      {filterEntityName && (
        <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-900 dark:text-orange-300">
            <Filter className="w-4 h-4 text-orange-600" />
            <span>Showing products filtered for {filterEntityName}</span>
          </div>
          <button
            onClick={handleClearFilter}
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline px-3 py-1 bg-white dark:bg-[#121315] rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm"
          >
            <X className="w-3.5 h-3.5" /> Clear Filter
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#121315] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterActive('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterActive === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setFilterActive('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterActive === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setFilterActive('inactive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              filterActive === 'inactive'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 space-y-2">
            <Package className="w-12 h-12 mx-auto text-gray-400" />
            <p className="font-semibold text-base">No products found.</p>
            {filterEntityName && (
              <button
                onClick={handleClearFilter}
                className="text-xs text-orange-600 hover:underline font-bold"
              >
                Clear Filter to view all catalog products
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category / Brand</th>
                  <th className="px-5 py-3.5">Variants</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {prod.name}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{prod.category?.name || 'Uncategorized'}</div>
                      <div className="text-gray-400">{prod.brand?.name || 'No Brand'}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {prod.variant_count ?? prod.variants?.length ?? 0} {(prod.variant_count ?? prod.variants?.length ?? 0) === 1 ? 'variant' : 'variants'} · {prod.total_stock ?? 0} {(prod.total_stock ?? 0) === 1 ? 'unit' : 'units'}
                    </td>
                    <td className="px-5 py-4">
                      {prod.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Link
                        to={`/admin/products/${prod.id}/edit`}
                        className="inline-flex items-center p-1.5 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400"
                        title="Edit Product & Variants"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductListPage;
