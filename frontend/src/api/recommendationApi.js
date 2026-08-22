import api from './axios';

export const recommendationApi = {
  getRecommendations: async ({ limit = 6, categoryId = null } = {}) => {
    const params = { limit };
    if (categoryId !== null && categoryId !== undefined && categoryId !== '') {
      params.category_id = categoryId;
    }
    const response = await api.get('/api/recommendations/', { params });
    return response.data;
  },
};
