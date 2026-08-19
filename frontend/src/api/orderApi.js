import api from './axios';

export const orderApi = {
  // Submit checkout converting cart to order
  checkout: async ({ address_id }) => {
    const response = await api.post('/api/orders/checkout/', { address_id });
    return response.data;
  },

  // Get user order history list
  getOrders: async () => {
    const response = await api.get('/api/orders/');
    return response.data;
  },

  // Get single order detail by order_number
  getOrderByNumber: async (orderNumber) => {
    const response = await api.get(`/api/orders/${orderNumber}/`);
    return response.data;
  },
};

export default orderApi;
