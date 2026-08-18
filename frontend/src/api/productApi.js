import api from './axios';

export const productApi = {
  getCategories: async () => {
    const response = await api.get('/api/products/categories/');
    return response.data;
  },

  getBrands: async () => {
    const response = await api.get('/api/products/brands/');
    return response.data;
  },

  getProducts: async (params = {}) => {
    const response = await api.get('/api/products/products/', { params });
    return response.data;
  },

  getProductDetail: async (idOrSlug) => {
    const response = await api.get(`/api/products/products/${idOrSlug}/`);
    return response.data;
  },
};
