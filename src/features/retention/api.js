/**
 * Endpoints du domaine Rétention (F6.9, super admin).
 * Réponses validées par zod (Q2).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  retentionStatusSchema,
  retentionReportsSchema,
  retentionReportSchema,
} from '../../lib/validate';

export const retentionApi = {
  status: async ({ campusId } = {}) => {
    const { data } = await api.get('/admin/retention/status', {
      params: campusId ? { campus_id: campusId } : undefined,
    });
    return parseOrThrow(retentionStatusSchema, data, 'GET /admin/retention/status');
  },

  /** `dry_run: true` simule sans aucune écriture (jamais d'exécution réelle
   *  sans confirmation explicite côté UI). */
  run: async ({ dryRun = true } = {}) => {
    const { data } = await api.post('/admin/retention/run', { dry_run: dryRun });
    return parseOrThrow(retentionReportSchema, data, 'POST /admin/retention/run');
  },

  reports: async (params = {}) => {
    const { data } = await api.get('/admin/retention/reports', { params });
    return parseOrThrow(retentionReportsSchema, data, 'GET /admin/retention/reports');
  },
};
