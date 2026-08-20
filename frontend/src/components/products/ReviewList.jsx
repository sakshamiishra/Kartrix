import React from 'react';
import { ShieldCheck, Edit3, Trash2, User } from 'lucide-react';
import { StarRating } from './StarRating';

export const ReviewList = ({
  reviews = [],
  currentUser = null,
  onEditReview = () => {},
  onDeleteReview = () => {},
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-32 bg-white dark:bg-[#17191B] rounded-2xl border border-gray-100 dark:border-[#2A2D32] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-12 text-center space-y-3">
        <p className="text-base font-bold text-gray-900 dark:text-white">No Customer Reviews Yet</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Be the first verified customer to share your experience with this product!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwner = currentUser && (currentUser.id === review.user || currentUser.email === review.user_email);
        const canDelete = isOwner || (currentUser && currentUser.is_staff);

        const createdDate = new Date(review.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        return (
          <div
            key={review.id}
            className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 space-y-4 shadow-sm transition-all hover:border-gray-200 dark:hover:border-gray-700"
          >
            {/* Review Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm">
                  {review.user_name ? review.user_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">{review.user_name}</h4>
                    {review.is_verified_purchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">{createdDate}</span>
                </div>
              </div>

              {/* Action Buttons for Owner / Staff */}
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button
                    onClick={() => onEditReview(review)}
                    className="p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    title="Edit Review"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDeleteReview(review.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Rating Stars & Title */}
            <div className="space-y-1">
              <StarRating rating={review.rating} size="sm" />
              {review.title && (
                <h5 className="font-bold text-sm text-gray-900 dark:text-white pt-1">{review.title}</h5>
              )}
            </div>

            {/* Comment Body */}
            {review.comment && (
              <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {review.comment}
              </p>
            )}

            {/* Attached Review Images */}
            {review.images && review.images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {review.images.map((img) => (
                  <a
                    key={img.id}
                    href={img.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-[#2A2D32] hover:opacity-90 transition-opacity"
                  >
                    <img src={img.image} alt="Review attachment" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReviewList;
