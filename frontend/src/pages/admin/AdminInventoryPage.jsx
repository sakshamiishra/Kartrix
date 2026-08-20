import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Warehouse, AlertTriangle, Search, Filter, History, ChevronLeft, ChevronRight } from 'lucide-react';

export function AdminInventoryPage() {
  // Inventory state
  const [inventoryList, setInventoryList] = useState([]);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [invPage, setInvPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState([]);
  const [txCount, setTxCount] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(true);

  // Stock Adjustment Modal state
  const [selectedInv, setSelectedInv] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('INCOMING');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [invPage, stockFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [txPage]);

  // Debounced search trigger (or trigger on input change with page reset)
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setInvPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = {
        page: invPage,
        search: searchQuery.trim(),
        stock_filter: stockFilter !== 'all' ? stockFilter : '',
      };
      const res = await adminApi.getInventory(params);
      if (res.results) {
        setInventoryList(res.results);
        setInventoryCount(res.count);
      } else {
        setInventoryList(Array.isArray(res) ? res : []);
        setInventoryCount(Array.isArray(res) ? res.length : 0);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await adminApi.getInventoryTransactions({ page: txPage });
      if (res.results) {
        setTransactions(res.results);
        setTxCount(res.count);
      } else {
        setTransactions(Array.isArray(res) ? res : []);
        setTxCount(Array.isArray(res) ? res.length : 0);
      }
    } catch (err) {
      console.error('Failed to load inventory transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInv || !adjustQty) return;
    try {
      setAdjusting(true);
      const qtyChange = adjustType === 'INCOMING' ? Math.abs(parseInt(adjustQty, 10)) : -Math.abs(parseInt(adjustQty, 10));
      await adminApi.adjustStock({
        inventory_id: selectedInv.id,
        quantity_change: qtyChange,
        transaction_type: adjustType,
        note: adjustNote,
      });
      alert('Stock adjusted successfully!');
      setSelectedInv(null);
      setAdjustQty('');
      setAdjustNote('');
      fetchInventory();
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.quantity_change || err.response?.data?.detail || 'Failed to adjust stock.');
    } finally {
      setAdjusting(false);
    }
  };

  const totalInvPages = Math.max(1, Math.ceil(inventoryCount / 25));
  const showingStart = inventoryCount > 0 ? (invPage - 1) * 25 + 1 : 0;
  const showingEnd = Math.min(invPage * 25, inventoryCount);

  const totalTxPages = Math.max(1, Math.ceil(txCount / 25));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Inventory & Stock Control
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitor product stock levels, receive low-stock alerts, perform audit adjustments, and search SKU catalog items.
        </p>
      </div>

      {/* Controls Bar: Search & Stock Filters */}
      <div className="bg-white dark:bg-[#121315] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by Product, Variant, SKU..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-white"
          />
        </div>

        {/* Stock Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'in_stock', label: 'In Stock' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => {
                setStockFilter(btn.id);
                setInvPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                stockFilter === btn.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Stock Table Container */}
      <div className="bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Stock Levels (Lowest First)
            </h2>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Showing {showingStart}–{showingEnd} of {inventoryCount} items
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : inventoryList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No matching inventory items found.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-3.5">Product & Variant / SKU</th>
                  <th className="px-5 py-3.5">Quantity Available</th>
                  <th className="px-5 py-3.5">Reserved</th>
                  <th className="px-5 py-3.5">Reorder Level</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {inventoryList.map((inv) => {
                  const isLowStock = (inv.quantity - inv.reserved_quantity) <= inv.reorder_level;
                  const isOutOfStock = inv.quantity <= 0;
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-4 text-xs font-semibold text-gray-900 dark:text-white">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {inv.product_name || inv.product_variant_detail?.product?.name || 'Product'}
                        </div>
                        {inv.variant_name && inv.variant_name !== inv.sku && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            {inv.variant_name}
                          </div>
                        )}
                        <div className="font-mono text-[11px] text-gray-400 font-normal">
                          SKU: {inv.sku || inv.product_variant_detail?.sku || `Variant #${inv.product_variant}`}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-base text-gray-900 dark:text-white">
                        {inv.quantity}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{inv.reserved_quantity}</td>
                      <td className="px-5 py-4 text-gray-500">{inv.reorder_level}</td>
                      <td className="px-5 py-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedInv(inv)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalInvPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-[#1A1C1E]/50">
            <button
              type="button"
              disabled={invPage <= 1}
              onClick={() => setInvPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-[50vw]">
              {Array.from({ length: totalInvPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setInvPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    invPage === pNum
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={invPage >= totalInvPages}
              onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-[#121315] border border-gray-200 dark:border-gray-800 text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Manual Stock Adjustment Modal */}
      {selectedInv && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16181A] max-w-md w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Adjust Stock for {selectedInv.sku || selectedInv.product_variant_detail?.sku || `Variant #${selectedInv.product_variant}`}
            </h3>
            <p className="text-xs text-gray-500">Current Stock: <strong>{selectedInv.quantity}</strong> units</p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                >
                  <option value="INCOMING">INCOMING (Add Stock)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Manual Correction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Units Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 25"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Audit Note</label>
                <input
                  type="text"
                  placeholder="Reason for adjustment..."
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-[#1A1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInv(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow"
                >
                  {adjusting ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Audit Log with Server-Side Pagination */}
      <div className="bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Audit Transaction Log</h2>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Page {txPage} of {totalTxPages} ({txCount} total transactions)
          </div>
        </div>

        {txLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#1A1C1E] text-xs font-semibold text-gray-500 uppercase z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Reference / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-gray-500">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{tx.transaction_type}</td>
                    <td className="px-4 py-3 font-bold">{tx.quantity}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono">{tx.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Log Pagination Bar */}
        {totalTxPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              disabled={txPage <= 1}
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-gray-500 font-medium">
              Page {txPage} of {totalTxPages}
            </span>
            <button
              type="button"
              disabled={txPage >= totalTxPages}
              onClick={() => setTxPage((p) => Math.min(totalTxPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminInventoryPage;
