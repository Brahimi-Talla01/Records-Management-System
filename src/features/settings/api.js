/**
 * Endpoints du domaine Réglages (F4 lecture publique ; F6 éditeur admin).
 * Réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  publicSettingsSchema,
  settingsSchemaSchema,
  settingsValuesSchema,
} from '../../lib/validate';

export const settingsApi = {
  /** Réglages publics (sans authentification) : limites de dépôt, features. */
  public: async () => {
    const { data } = await api.get('/settings/public');
    return parseOrThrow(publicSettingsSchema, data, 'GET /settings/public');
  },

  /** Définitions typées (types, portées, aide) — admin. */
  schema: async () => {
    const { data } = await api.get('/settings/schema');
    return parseOrThrow(settingsSchemaSchema, data, 'GET /settings/schema');
  },

  /** Valeurs effectives (défaut → global → campus) — admin. */
  values: async ({ campusId } = {}) => {
    const { data } = await api.get('/settings', {
      params: campusId ? { campus_id: campusId } : undefined,
    });
    return parseOrThrow(settingsValuesSchema, data, 'GET /settings');
  },

  /** Valeurs par défaut du registre — admin. */
  defaults: async () => {
    const { data } = await api.get('/settings/defaults');
    return parseOrThrow(settingsValuesSchema, data, 'GET /settings/defaults');
  },

  /** Mise à jour en lot (`{settings: [{key, value, scope, campus_id?}]}`). */
  update: async (items) => {
    const { data } = await api.put('/settings', { settings: items });
    return data;
  },
};
