import React, { useState } from 'react';
import { Star } from 'lucide-react';

export const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onChange = () => {},
  showCount = false,
  count = 0,
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const activeSize = starSizes[size] || starSizes.md;

  const currentDisplayRating = interactive ? (hoverRating || rating) : rating;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5" onMouseLeave={() => interactive && setHoverRating(0)}>
        {[...Array(maxStars)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= currentDisplayRating;
          const isHalf = !isFilled && starValue - 0.5 <= currentDisplayRating;

          return (
            <button
              key={index}
              type={interactive ? 'button' : undefined}
              disabled={!interactive}
              onClick={() => interactive && onChange(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'} focus:outline-none`}
            >
              <Star
                className={`${activeSize} ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'fill-gray-200 dark:fill-gray-800 text-gray-300 dark:text-gray-700'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showCount && (
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 ml-1">
          {rating > 0 ? rating.toFixed(1) : 'No ratings'}{' '}
          {count > 0 && <span className="text-gray-400">({count})</span>}
        </span>
      )}
    </div>
  );
};

export default StarRating;
