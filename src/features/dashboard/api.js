/**
 * Endpoints API du domaine Dashboard (+ santé/version pour l'encart admin).
 * Chaque réponse est validée par zod avant de sortir du domaine (décision Q2).
 */
import { api, API_BASE_URL } from '../../lib/api';
import {
  parseOrThrow,
  dashboardSummarySchema,
  activityListSchema,
  expiringDocumentsSchema,
  recentDocumentsSchema,
  uploadsSchema,
  readinessSchema,
  versionSchema,
} from '../../lib/validate';

// `/health/ready` vit à la racine du serveur, pas sous `/api` (P5).
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export const dashboardApi = {
  summary: async ({ campusId } = {}) => {
    const params = campusId ? { campus_id: campusId } : undefined;
    const { data } = await api.get('/dashboard/summary', { params });
    return parseOrThrow(dashboardSummarySchema, data, 'GET /dashboard/summary');
  },

  activity: async ({ days = 30, page = 1, perPage = 10 } = {}) => {
    const { data } = await api.get('/dashboard/activity', {
      params: { days, page, per_page: perPage },
    });
    return parseOrThrow(activityListSchema, data, 'GET /dashboard/activity');
  },

  expiring: async ({ days = 30, page = 1, perPage = 10 } = {}) => {
    const { data } = await api.get('/dashboard/expiring', {
      params: { days, page, per_page: perPage },
    });
    return parseOrThrow(expiringDocumentsSchema, data, 'GET /dashboard/expiring');
  },

  recentDocuments: async ({ limit = 6 } = {}) => {
    const { data } = await api.get('/dashboard/recent-documents', { params: { limit } });
    return parseOrThrow(recentDocumentsSchema, data, 'GET /dashboard/recent-documents');
  },

  uploads: async ({ months = 12 } = {}) => {
    const { data } = await api.get('/dashboard/uploads', { params: { months } });
    return parseOrThrow(uploadsSchema, data, 'GET /dashboard/uploads');
  },

  /** Readiness Docker : 200 `ready` ou 503 `degraded` (les deux sont valides ici). */
  readiness: async () => {
    const { data } = await api.get(`${SERVER_BASE_URL}/health/ready`, {
      validateStatus: (status) => status === 200 || status === 503,
    });
    return parseOrThrow(readinessSchema, data, 'GET /health/ready');
  },

  version: async () => {
    const { data } = await api.get('/version');
    return parseOrThrow(versionSchema, data, 'GET /api/version');
  },
};
