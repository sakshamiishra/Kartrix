import api from './axios';

export const reviewApi = {
  getReviews: async (product, params = {}) => {
    const response = await api.get('/api/reviews/reviews/', {
      params: { product, ...params },
    });
    return response.data;
  },

  getReviewSummary: async (product) => {
    const response = await api.get('/api/reviews/reviews/summary/', {
      params: { product },
    });
    return response.data;
  },

  createReview: async (formData) => {
    // If formData is FormData instance (for image upload) or plain object
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.post('/api/reviews/reviews/', formData, { headers });
    return response.data;
  },

  updateReview: async (reviewId, formData) => {
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.patch(`/api/reviews/reviews/${reviewId}/`, formData, { headers });
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/api/reviews/reviews/${reviewId}/`);
    return response.data;
  },

  getMyReviews: async () => {
    const response = await api.get('/api/reviews/reviews/my_reviews/');
    return response.data;
  },

  getReviewableItems: async () => {
    const response = await api.get('/api/reviews/reviews/reviewable_items/');
    return response.data;
  },
};
