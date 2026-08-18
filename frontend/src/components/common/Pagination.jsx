import React from 'react';

export const Pagination = ({ currentPage = 1, totalCount = 0, pageSize = 12, onPageChange }) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-100 dark:border-[#2A2D32]">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-900 dark:text-white">{startItem}-{endItem}</span> of{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span> products
      </p>

      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-[#2A2D32] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17191B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => {
          const pageNum = idx + 1;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17191B]'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-[#2A2D32] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17191B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};
