import api from './axios';

export const orderApi = {
  // Submit checkout converting cart to order
  checkout: async ({ address_id, payment_method = 'RAZORPAY' }) => {
    const response = await api.post('/api/orders/checkout/', { address_id, payment_method });
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

  // Cancel order by order_number
  cancelOrder: async (orderNumber) => {
    const response = await api.post(`/api/orders/${orderNumber}/cancel/`);
    return response.data;
  },
};


export default orderApi;
