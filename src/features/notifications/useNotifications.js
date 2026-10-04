/**
 * Hooks TanStack Query du domaine notifications.
 * Le compteur non-lu est pollé (Q5 : 30–60 s) — c'est lui qui alimente le badge
 * du Header et se met à jour sans recharger la page.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './api';
import { notificationsKeys } from '../../lib/queryKeys';

export const UNREAD_POLL_INTERVAL = 45 * 1000;

export function useNotifications({ page = 1, perPage = 20, unreadOnly = false } = {}) {
  return useQuery({
    queryKey: notificationsKeys.list({ page, perPage, unreadOnly }),
    queryFn: () => notificationsApi.list({ page, perPage, unreadOnly }),
    placeholderData: (prev) => prev,
  });
}

/** Compteur non-lu pollé : source du badge Header et du résumé. */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: UNREAD_POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

/** Invalide liste + compteur après toute mutation (badge toujours juste). */
function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
  };
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (notificationId) => notificationsApi.markRead(notificationId),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (notificationId) => notificationsApi.remove(notificationId),
    onSuccess: invalidate,
  });
}
