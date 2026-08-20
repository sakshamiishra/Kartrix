import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import { Star, CheckCircle, XCircle, Trash2, Check, ShieldCheck } from 'lucide-react';

export function AdminReviewListPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterApproved, setFilterApproved] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getReviews();
      setReviews(data.results || data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id) => {
    try {
      await adminApi.toggleReviewApproval(id);
      fetchReviews();
    } catch (err) {
      alert('Failed to toggle review approval.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review? This action cannot be undone.')) return;
    try {
      await adminApi.deleteReview(id);
      fetchReviews();
    } catch (err) {
      alert('Failed to delete review.');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterApproved === 'approved') return r.is_approved;
    if (filterApproved === 'pending') return !r.is_approved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Review Moderation Queue
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Moderate customer product reviews, approve verified purchaser feedback, and remove inappropriate content.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 bg-white dark:bg-[#121315] p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-fit">
        <button
          onClick={() => setFilterApproved('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterApproved === 'all'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          All Reviews
        </button>
        <button
          onClick={() => setFilterApproved('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterApproved === 'pending'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          Pending Moderation ({reviews.filter((r) => !r.is_approved).length})
        </button>
        <button
          onClick={() => setFilterApproved('approved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterApproved === 'approved'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          Approved
        </button>
      </div>

      {/* Reviews List */}
      <div className="bg-white dark:bg-[#121315] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No reviews found.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < rev.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{rev.title}</span>
                    {rev.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> Verified Purchase
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300">{rev.comment}</p>

                  <div className="text-[11px] text-gray-400 flex items-center gap-3 pt-1">
                    <span>By: {rev.user_name || rev.user}</span>
                    <span>Product ID: {rev.product}</span>
                    <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleApproval(rev.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                      rev.is_approved
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {rev.is_approved ? 'Unapprove' : 'Approve Review'}
                  </button>

                  <button
                    onClick={() => handleDelete(rev.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReviewListPage;
