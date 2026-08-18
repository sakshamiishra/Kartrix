import api from './axios';

export const cartApi = {
  // Get current user's cart
  getCart: async () => {
    const response = await api.get('/api/cart/');
    return response.data;
  },

  // Add item to cart ({ product_id, product_variant_id, quantity })
  addToCart: async (data) => {
    const response = await api.post('/api/cart/items/', data);
    return response.data;
  },

  // Update cart item quantity
  updateCartItem: async (itemId, quantity) => {
    const response = await api.patch(`/api/cart/items/${itemId}/`, { quantity });
    return response.data;
  },

  // Remove item from cart
  removeCartItem: async (itemId) => {
    const response = await api.delete(`/api/cart/items/${itemId}/`);
    return response.data;
  },

  // Clear entire cart
  clearCart: async () => {
    const response = await api.post('/api/cart/clear/');
    return response.data;
  },
};
