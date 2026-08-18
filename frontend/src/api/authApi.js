import api from './axios';

export const authApi = {
  login: async (credentials) => {
    const response = await api.post('/api/accounts/login/', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/accounts/register/', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/accounts/profile/');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/api/accounts/profile/', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.post('/api/accounts/change-password/', data);
    return response.data;
  },

  getAddresses: async () => {
    const response = await api.get('/api/accounts/addresses/');
    return response.data;
  },

  createAddress: async (addressData) => {
    const response = await api.post('/api/accounts/addresses/', addressData);
    return response.data;
  },

  updateAddress: async (id, addressData) => {
    const response = await api.patch(`/api/accounts/addresses/${id}/`, addressData);
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await api.delete(`/api/accounts/addresses/${id}/`);
    return response.data;
  },

  setDefaultAddress: async (id) => {
    const response = await api.post(`/api/accounts/addresses/${id}/set-default/`);
    return response.data;
  },
};
