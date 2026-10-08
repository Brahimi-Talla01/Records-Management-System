/**
 * Endpoints du domaine Audit (F6.8). Réponses validées par zod (Q2).
 */
import { api } from '../../lib/api';
import { parseOrThrow, auditListSchema } from '../../lib/validate';
import { downloadFromApi } from '../../lib/download';

/** Filtres UI → paramètres d'URL API (les vides sont omis). */
export function toAuditParams(state = {}) {
  const out = {};
  const copy = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  };
  copy('action', state.action);
  copy('object_type', state.object_type);
  copy('user_id', state.user_id);
  copy('from', state.from);
  copy('to', state.to);
  copy('campus_id', state.campus_id);
  copy('page', state.page);
  copy('per_page', state.per_page);
  return out;
}

export const auditApi = {
  list: async (params = {}) => {
    const { data } = await api.get('/audit', { params: toAuditParams(params) });
    return parseOrThrow(auditListSchema, data, 'GET /audit');
  },

  exportCsv: async (params = {}) =>
    downloadFromApi(
      `/audit/export?${new URLSearchParams(toAuditParams(params))}`,
      'audit_export.csv'
    ),
};
