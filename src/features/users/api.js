/**
 * Endpoints API du domaine Users.
 */
import { api } from '../../lib/api';

export const usersApi = {
  list: async ({ page = 1, perPage = 20, filters = {} } = {}) => {
    const params = { page, per_page: perPage, ...filters };
    const { data } = await api.get('/users', { params });
    return data; // { users, total, pages, current_page, per_page }
  },

  get: async (userId) => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post('/users', payload);
    return data;
  },

  update: async (userId, payload) => {
    const { data } = await api.put(`/users/${userId}`, payload);
    return data;
  },

  remove: async (userId) => {
    const { data } = await api.delete(`/users/${userId}`);
    return data;
  },

  resetPassword: async (userId, newPassword) => {
    const { data } = await api.post(`/users/${userId}/reset-password`, {
      new_password: newPassword,
    });
    return data;
  },

  importCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  exportUrl: '/users/export',

  statistics: async () => {
    const { data } = await api.get('/users/statistics');
    return data;
  },

  roles: async () => {
    const { data } = await api.get('/users/roles');
    return data;
  },

  departments: async () => {
    const { data } = await api.get('/users/departments');
    return data;
  },
};
