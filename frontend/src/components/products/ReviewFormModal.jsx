import React, { useState, useEffect } from 'react';
import { X, Loader2, Upload, Star } from 'lucide-react';
import { StarRating } from './StarRating';

export const ReviewFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  productName = '',
  loading = false,
}) => {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating || 5);
      setTitle(initialData.title || '');
      setComment(initialData.comment || '');
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setImages([]);
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    onSubmit({
      rating,
      title,
      comment,
      images,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 max-w-lg w-full space-y-6 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2A2D32] pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {initialData ? 'Edit Product Review' : 'Write a Review'}
            </h3>
            {productName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{productName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating Selector */}
          <div className="space-y-2 text-center py-2 bg-gray-50 dark:bg-[#0F1011] rounded-2xl border border-gray-100 dark:border-[#2A2D32]">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              Overall Rating
            </label>
            <StarRating
              rating={rating}
              size="xl"
              interactive={true}
              onChange={(val) => setRating(val)}
              className="justify-center"
            />
            <span className="text-xs font-bold text-amber-500 block">
              {rating === 5 && 'Outstanding!'}
              {rating === 4 && 'Very Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Below Average'}
              {rating === 1 && 'Poor'}
            </span>
          </div>

          {/* Review Title Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Review Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fantastic build quality & comfortable fit"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Review Comment Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Review Details
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what you liked or disliked about this product..."
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0F1011] border border-gray-200 dark:border-[#2A2D32] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Optional Image Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Attach Photos (Optional)</span>
              {images.length > 0 && <span className="text-orange-600">{images.length} selected</span>}
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="review-image-input"
              />
              <label
                htmlFor="review-image-input"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-[#0F1011] border border-dashed border-gray-300 dark:border-gray-700 hover:border-orange-500 rounded-xl cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors"
              >
                <Upload className="w-4 h-4 text-orange-600" />
                <span>Upload Photos</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Review' : 'Submit Review'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewFormModal;
