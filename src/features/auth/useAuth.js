/**
 * Hooks du domaine auth (Zustand pour l'état, TanStack Query pour le serveur).
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from './authStore';
import { authKeys } from '../../lib/queryKeys';

export const AUTH_QUERY_KEY = ['auth', 'me'];

/**
 * Hook principal : expose l'utilisateur, le statut et les actions.
 * Au premier montage, interroge GET /auth/me (source de vérité = session cookie).
 */
export function useAuth() {
  const { user, status, setUser, clear } = useAuthStore();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const user = await authApi.me();
        return user;
      } catch (error) {
        if (error?.response?.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (meQuery.isSuccess) {
      setUser(meQuery.data);
      return;
    }
    // Échec réseau / serveur de /auth/me (hors 401 déjà neutralisé plus haut) :
    // sans ce cas le store resterait à 'idle' et le statut à 'loading' → loader infini.
    if (meQuery.isError) {
      clear();
    }
  }, [meQuery.isSuccess, meQuery.isError, meQuery.data, setUser, clear]);

  const login = useMutation({
    mutationFn: ({ username, password }) => authApi.login(username, password),
    onSuccess: (data) => {
      // Parcours sans 2FA : le backend renvoie { message, user } et pose déjà
      // les cookies → on alimente le store. Avec 2FA (cas actuel), pas de
      // `user` dans la réponse : rien à faire, il viendra de POST /auth/verify-2fa.
      if (data?.user) {
        setUser(data.user);
        queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      }
    },
  });

  const verify2FA = useMutation({
    mutationFn: ({ userId, code }) => authApi.verify2FA(userId, code),
    onSuccess: (data) => {
      // Le backend vient de poser les cookies : on recharge l'utilisateur
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });

  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clear();
      queryClient.clear(); // purge toutes les données serveur de l'ancien compte
    },
  });

  return {
    user,
    status: status === 'idle' || meQuery.isPending ? 'loading' : status,
    isLoading: meQuery.isPending,
    isAuthenticated: !!user,
    isAdmin: user?.role?.name?.toLowerCase() === 'admin',
    login,
    verify2FA,
    logout,
    refetchMe: meQuery.refetch,
  };
}

/**
 * Liste des sessions actives du compte (pour « Mes appareils »).
 */
export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: () => authApi.listSessions(),
  });
}

/**
 * Révoque une session précise (un appareil), sans toucher à la session courante.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => authApi.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.sessions }),
  });
}

/**
 * Déconnexion partout (révoque toutes les sessions).
 */
export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => {
      clear();
      queryClient.clear();
    },
  });
}

/** Alertes de sécurité non résolues du compte courant. */
export function useSecurityAlerts() {
  return useQuery({
    queryKey: authKeys.securityAlerts,
    queryFn: () => authApi.securityAlerts(),
  });
}

/** Marque une alerte de sécurité comme résolue. */
export function useResolveSecurityAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId) => authApi.resolveAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.securityAlerts }),
  });
}

/** Change le mot de passe du compte connecté (session conservée). */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
  });
}

/** Finalise la réinitialisation via le lien email (route publique). */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }) => authApi.resetPassword(token, newPassword),
  });
}

/** Étape 1 : demande l'envoi du code d'activation 2FA. */
export function useEnable2FA() {
  return useMutation({ mutationFn: () => authApi.enable2FA() });
}

/** Étape 2 : confirme le code et active la 2FA (profil rafraîchi). */
export function useConfirm2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code) => authApi.confirm2FA(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY }),
  });
}

/** Désactive la 2FA (profil rafraîchi). */
export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.disable2FA(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY }),
  });
}
