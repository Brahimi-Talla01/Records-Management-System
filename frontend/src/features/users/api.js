/**
 * Endpoints API du domaine Users (liste étendue en F6.5).
 * Réponses validées par zod en frontière (Q2).
 */
import { api, API_BASE_URL } from '../../lib/api';
import {
  parseOrThrow,
  usersListSchema,
  userStatisticsSchema,
  userImportResultSchema,
} from '../../lib/validate';

/** Filtres UI → paramètres `GET /users` (les vides sont omis). */
export function toUsersParams({ page = 1, perPage = 20, filters = {} } = {}) {
  const params = { page, per_page: perPage };
  const copy = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    params[key] = value;
  };
  copy('search', filters.search);
  copy('role_id', filters.role_id);
  copy('department_id', filters.department_id);
  copy('is_active', filters.is_active);
  return params;
}

export const usersApi = {
  list: async (query = {}) => {
    const { data } = await api.get('/users', { params: toUsersParams(query) });
    return parseOrThrow(usersListSchema, data, 'GET /users');
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

  /** Soft delete serveur : le compte passe à `is_active: false`. */
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
    return parseOrThrow(userImportResultSchema, data, 'POST /users/import');
  },

  /** Export CSV (mêmes filtres que la liste) — ouvert avec `noopener`. */
  exportUrl: (filters = {}) => {
    const qs = new URLSearchParams(
      Object.entries(toUsersParams({ perPage: undefined, filters })).filter(
        ([key, value]) => key !== 'per_page' && key !== 'page' && value !== undefined
      )
    ).toString();
    return `${API_BASE_URL}/users/export${qs ? `?${qs}` : ''}`;
  },

  statistics: async () => {
    const { data } = await api.get('/users/statistics');
    return parseOrThrow(userStatisticsSchema, data, 'GET /users/statistics');
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
