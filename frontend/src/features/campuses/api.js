/**
 * Endpoints du domaine Campus & institution (F6).
 * Réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  campusSchema,
  campusesListSchema,
  institutionSchema,
} from '../../lib/validate';

export const campusesApi = {
  list: async ({ activeOnly = false } = {}) => {
    const { data } = await api.get('/campuses', {
      params: activeOnly ? { active_only: 'true' } : undefined,
    });
    return parseOrThrow(campusesListSchema, data, 'GET /campuses').campuses;
  },

  get: async (campusId) => {
    const { data } = await api.get(`/campuses/${campusId}`);
    return parseOrThrow(campusSchema, data, 'GET /campuses/<id>');
  },

  create: async (payload) => {
    const { data } = await api.post('/campuses', payload);
    return parseOrThrow(campusSchema, data, 'POST /campuses');
  },

  update: async (campusId, payload) => {
    const { data } = await api.put(`/campuses/${campusId}`, payload);
    return parseOrThrow(campusSchema, data, 'PUT /campuses/<id>');
  },

  setStatus: async (campusId, isActive) => {
    const { data } = await api.patch(`/campuses/${campusId}/status`, { is_active: isActive });
    return parseOrThrow(campusSchema, data, 'PATCH /campuses/<id>/status');
  },

  /** Suppression toujours refusée côté serveur (`409`) : on expose l'appel pour
   *  que l'UI affiche le message exact, sans jamais supprimer. */
  remove: async (campusId) => {
    const { data } = await api.delete(`/campuses/${campusId}`);
    return data;
  },
};

export const institutionApi = {
  get: async () => {
    const { data } = await api.get('/institution');
    return parseOrThrow(institutionSchema, data, 'GET /institution');
  },

  update: async (payload) => {
    const { data } = await api.put('/institution', payload);
    return parseOrThrow(institutionSchema, data, 'PUT /institution');
  },
};
