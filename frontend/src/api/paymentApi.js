import api from './axios';

export const paymentApi = {
  // Initialize Razorpay Order for an existing order
  createRazorpayOrder: async ({ order_number }) => {
    const response = await api.post('/api/payments/create-razorpay-order/', { order_number });
    return response.data;
  },

  // Verify Razorpay Payment signature on backend
  verifyRazorpayPayment: async ({ order_number, razorpay_payment_id, razorpay_order_id, razorpay_signature }) => {
    const response = await api.post('/api/payments/verify-razorpay-payment/', {
      order_number,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    });
    return response.data;
  },
};

export default paymentApi;
