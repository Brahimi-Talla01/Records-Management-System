/**
 * Endpoints API du domaine Notifications.
 * Toutes les opérations sont bornées au propriétaire (le backend renvoie 404
 * pour la notification d'autrui, jamais 403).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  notificationsListSchema,
  unreadCountSchema,
} from '../../lib/validate';

export const notificationsApi = {
  list: async ({ page = 1, perPage = 20, unreadOnly = false } = {}) => {
    const { data } = await api.get('/notifications', {
      params: { page, per_page: perPage, ...(unreadOnly ? { unread: 1 } : {}) },
    });
    return parseOrThrow(notificationsListSchema, data, 'GET /notifications');
  },

  unreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count');
    return parseOrThrow(unreadCountSchema, data, 'GET /notifications/unread-count').unread;
  },

  markRead: async (notificationId) => {
    const { data } = await api.patch(`/notifications/${notificationId}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.post('/notifications/read-all');
    return data; // { updated }
  },

  remove: async (notificationId) => {
    const { data } = await api.delete(`/notifications/${notificationId}`);
    return data; // { deleted: true }
  },
};
