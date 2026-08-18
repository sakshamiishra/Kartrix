import React, { useState } from 'react';

export const ProductGallery = ({ images = [], productName = 'Product' }) => {
  const API_BASE_URL = 'http://localhost:8000';

  const formatUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const imageList = images.length > 0 
    ? images 
    : [{ id: 'def', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800' }];

  const [selectedImage, setSelectedImage] = useState(imageList[0]?.image);

  return (
    <div className="space-y-4">
      {/* Primary Image View */}
      <div className="aspect-square w-full rounded-3xl bg-gray-100 dark:bg-[#17191B] border border-gray-100 dark:border-[#2A2D32] overflow-hidden shadow-sm flex items-center justify-center p-4">
        <img
          src={formatUrl(selectedImage || imageList[0]?.image)}
          alt={productName}
          className="w-full h-full object-contain object-center transition-all duration-300"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
          }}
        />
      </div>

      {/* Thumbnails */}
      {imageList.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {imageList.map((imgItem, idx) => (
            <button
              key={imgItem.id || idx}
              onClick={() => setSelectedImage(imgItem.image)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                selectedImage === imgItem.image
                  ? 'border-orange-600 dark:border-orange-500 scale-95 shadow-md'
                  : 'border-gray-200 dark:border-[#2A2D32] opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={formatUrl(imgItem.image)}
                alt={`${productName} ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
