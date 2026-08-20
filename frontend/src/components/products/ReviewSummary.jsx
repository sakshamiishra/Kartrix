import React from 'react';
import { StarRating } from './StarRating';

export const ReviewSummary = ({ summary }) => {
  if (!summary) return null;

  const { average_rating = 0, total_reviews = 0, rating_breakdown = {} } = summary;

  return (
    <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 lg:p-8 space-y-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Customer Reviews</h3>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* Overall Rating Score Box */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#0F1011] rounded-2xl border border-gray-100 dark:border-[#2A2D32] text-center space-y-2">
          <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            {average_rating > 0 ? average_rating.toFixed(1) : '0.0'}
          </span>
          <StarRating rating={average_rating} size="lg" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Based on {total_reviews} verified {total_reviews === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="sm:col-span-7 space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = rating_breakdown[stars] || 0;
            const percentage = total_reviews > 0 ? Math.round((count / total_reviews) * 100) : 0;

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <span>{stars}</span>
                  <span className="text-amber-400">★</span>
                </span>
                <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-gray-500 dark:text-gray-400">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewSummary;
