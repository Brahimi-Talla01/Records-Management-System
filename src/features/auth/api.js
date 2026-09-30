/**
 * Endpoints API du domaine Auth (session opaque : aucun token manipulé ici).
 */
import { api } from '../../lib/api';

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
    return data; // User
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  listSessions: async () => {
    const { data } = await api.get('/auth/sessions');
    return data.sessions;
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
};
