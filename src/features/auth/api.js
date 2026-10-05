/**
 * Endpoints API du domaine Auth (session opaque : aucun token manipulé ici).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  userSchema,
  sessionsListSchema,
  securityAlertsListSchema,
} from '../../lib/validate';

export const authApi = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },

  verify2FA: async (userId, code) => {
    const { data } = await api.post('/auth/verify-2fa', { user_id: userId, code });
    return data; // { message, user }
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return parseOrThrow(userSchema, data, 'GET /auth/me');
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  listSessions: async () => {
    const { data } = await api.get('/auth/sessions');
    return parseOrThrow(sessionsListSchema, data, 'GET /auth/sessions').sessions;
  },

  revokeAllSessions: async () => {
    const { data } = await api.delete('/auth/sessions');
    return data;
  },

  revokeSession: async (sessionId) => {
    const { data } = await api.post('/auth/sessions/revoke', { session_id: sessionId });
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  /** Finalise le lien email : { token, new_password } → { message }. */
  resetPassword: async (token, newPassword) => {
    const { data } = await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return data;
  },

  /** Change le mot de passe du compte connecté : { current_password, new_password }. */
  changePassword: async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data;
  },

  /** Étape 1 de l'activation 2FA : envoie un code de vérification par email. */
  enable2FA: async () => {
    const { data } = await api.post('/auth/2fa/enable');
    return data;
  },

  /** Étape 2 : confirme le code et active réellement la 2FA. */
  confirm2FA: async (code) => {
    const { data } = await api.post('/auth/2fa/confirm', { code });
    return data;
  },

  disable2FA: async () => {
    const { data } = await api.post('/auth/2fa/disable');
    return data;
  },

  /** Alertes de sécurité non résolues du compte connecté. */
  securityAlerts: async () => {
    const { data } = await api.get('/auth/security-alerts');
    return parseOrThrow(securityAlertsListSchema, data, 'GET /auth/security-alerts').alerts;
  },

  resolveAlert: async (alertId) => {
    const { data } = await api.put(`/auth/security-alerts/${alertId}/resolve`);
    return data;
  },
};
