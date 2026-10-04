/**
 * Endpoints du domaine Réglages (F4 lit `public` ; F6 complète l'écriture).
 * Réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import { parseOrThrow, publicSettingsSchema } from '../../lib/validate';

export const settingsApi = {
  /** Réglages publics (sans authentification) : limites de dépôt, features. */
  public: async () => {
    const { data } = await api.get('/settings/public');
    return parseOrThrow(publicSettingsSchema, data, 'GET /settings/public');
  },
};
