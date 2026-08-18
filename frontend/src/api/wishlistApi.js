import api from './axios';

export const wishlistApi = {
  // List user's wishlist items
  getWishlist: async () => {
    const response = await api.get('/api/wishlist/items/');
    return response.data;
  },

  // Add item to wishlist
  addToWishlist: async (productId) => {
    const response = await api.post('/api/wishlist/items/', { product: productId });
    return response.data;
  },

  // Toggle wishlist item ({ product_id })
  toggleWishlist: async (productId) => {
    const response = await api.post('/api/wishlist/toggle/', { product_id: productId });
    return response.data;
  },

  // Remove wishlist item by ID
  removeWishlistItem: async (itemId) => {
    const response = await api.delete(`/api/wishlist/items/${itemId}/`);
    return response.data;
  },
};
