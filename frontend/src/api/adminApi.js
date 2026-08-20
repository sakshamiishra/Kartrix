import api from './axios';

export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard/');
    return response.data;
  },

  // Products
  getProducts: async (params = {}) => {
    const response = await api.get('/api/admin/products/', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/api/admin/products/${id}/`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/api/admin/products/', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.patch(`/api/admin/products/${id}/`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/api/admin/products/${id}/`);
    return response.data;
  },

  createVariant: async (productId, variantData) => {
    const response = await api.post(`/api/admin/products/${productId}/variants/`, variantData);
    return response.data;
  },

  updateVariant: async (productId, variantId, variantData) => {
    const response = await api.patch(`/api/admin/products/${productId}/variants/${variantId}/`, variantData);
    return response.data;
  },

  uploadImage: async (productId, formData) => {
    const response = await api.post(`/api/admin/products/${productId}/images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await api.get('/api/admin/categories/');
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/api/admin/categories/', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.patch(`/api/admin/categories/${id}/`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/api/admin/categories/${id}/`);
    return response.data;
  },

  // Brands
  getBrands: async () => {
    const response = await api.get('/api/admin/brands/');
    return response.data;
  },

  createBrand: async (brandData) => {
    const response = await api.post('/api/admin/brands/', brandData);
    return response.data;
  },

  updateBrand: async (id, brandData) => {
    const response = await api.patch(`/api/admin/brands/${id}/`, brandData);
    return response.data;
  },

  deleteBrand: async (id) => {
    const response = await api.delete(`/api/admin/brands/${id}/`);
    return response.data;
  },

  // Inventory
  getInventory: async (params = {}) => {
    const response = await api.get('/api/admin/inventory/', { params });
    return response.data;
  },

  adjustStock: async (adjustmentData) => {
    const response = await api.post('/api/admin/inventory/adjust/', adjustmentData);
    return response.data;
  },

  getInventoryTransactions: async (params = {}) => {
    const response = await api.get('/api/admin/inventory/transactions/', { params });
    return response.data;
  },

  // Orders
  getOrders: async (params = {}) => {
    const response = await api.get('/api/admin/orders/', { params });
    return response.data;
  },

  getOrder: async (orderNumber) => {
    const response = await api.get(`/api/admin/orders/${orderNumber}/`);
    return response.data;
  },

  updateOrderStatus: async (orderNumber, statusData) => {
    const response = await api.post(`/api/admin/orders/${orderNumber}/update_status/`, statusData);
    return response.data;
  },

  confirmCodPayment: async (orderNumber) => {
    const response = await api.post(`/api/admin/orders/${orderNumber}/confirm_cod/`);
    return response.data;
  },

  // Payments
  getPayments: async () => {
    const response = await api.get('/api/admin/payments/');
    return response.data;
  },

  recordRefund: async (paymentId, refundData) => {
    const response = await api.post(`/api/admin/payments/${paymentId}/record_refund/`, refundData);
    return response.data;
  },

  // Reviews
  getReviews: async () => {
    const response = await api.get('/api/admin/reviews/');
    return response.data;
  },

  toggleReviewApproval: async (id) => {
    const response = await api.post(`/api/admin/reviews/${id}/toggle_approval/`);
    return response.data;
  },

  deleteReview: async (id) => {
    const response = await api.delete(`/api/admin/reviews/${id}/`);
    return response.data;
  },

  // Coupons
  getCoupons: async () => {
    const response = await api.get('/api/admin/coupons/');
    return response.data;
  },

  createCoupon: async (couponData) => {
    const response = await api.post('/api/admin/coupons/', couponData);
    return response.data;
  },

  updateCoupon: async (id, couponData) => {
    const response = await api.patch(`/api/admin/coupons/${id}/`, couponData);
    return response.data;
  },

  deleteCoupon: async (id) => {
    const response = await api.delete(`/api/admin/coupons/${id}/`);
    return response.data;
  },

  // Users & Staff Management
  getUsers: async () => {
    const response = await api.get('/api/admin/users/');
    return response.data;
  },

  toggleStaff: async (userId) => {
    const response = await api.post(`/api/admin/users/${userId}/toggle_staff/`);
    return response.data;
  },
};
