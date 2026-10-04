/**
 * Endpoints du domaine Recherche (F5).
 * Réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import { parseOrThrow, searchResultsSchema, searchHistorySchema } from '../../lib/validate';

/** État de recherche → paramètres d'URL API (les vides sont omis). */
export function toApiParams(state = {}) {
  const out = {};
  const copy = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  };
  copy('q', state.q);
  copy('status', state.status);
  copy('department_id', state.department_id);
  copy('doc_type_id', state.doc_type_id);
  copy('confidentiality', state.confidentiality);
  copy('date_from', state.date_from);
  copy('date_to', state.date_to);
  copy('page', state.page);
  copy('per_page', state.per_page);
  if (state.tag_ids?.length) out.tag_ids = state.tag_ids.join(',');
  return out;
}

export const searchApi = {
  /** Recherche plein texte + facettes (`took_ms`, `engine`). */
  search: async (params = {}) => {
    const { data } = await api.get('/search', { params: toApiParams(params) });
    return parseOrThrow(searchResultsSchema, data, 'GET /search');
  },

  /** Historique dédupliqué des recherches passées. */
  history: async (params = {}) => {
    const { data } = await api.get('/search/history', { params });
    return parseOrThrow(searchHistorySchema, data, 'GET /search/history');
  },

  /** Vide l'historique du compte courant. */
  clearHistory: async () => {
    const { data } = await api.delete('/search/history');
    return data;
  },
};
