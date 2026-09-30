/**
 * Hooks du domaine auth (Zustand pour l'état, TanStack Query pour le serveur).
 */
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from './authStore';

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
    queryKey: ['auth', 'sessions'],
    queryFn: () => authApi.listSessions(),
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
