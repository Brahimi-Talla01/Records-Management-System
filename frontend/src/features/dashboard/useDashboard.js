/**
 * Hooks TanStack Query du domaine dashboard.
 * Aucun hook ne masque un jeu vide : l'API renvoie des listes vides aux rôles
 * non concernés, que les écrans traduisent en `EmptyState` (A9).
 */
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';
import { dashboardKeys, systemKeys } from '../../lib/queryKeys';

export function useDashboardSummary({ campusId } = {}) {
  return useQuery({
    queryKey: [...dashboardKeys.summary, { campusId: campusId ?? null }],
    queryFn: () => dashboardApi.summary({ campusId }),
    staleTime: 60 * 1000,
  });
}

export function useDashboardActivity({ days = 30, page = 1, perPage = 10 } = {}) {
  return useQuery({
    queryKey: dashboardKeys.activity({ days, page, perPage }),
    queryFn: () => dashboardApi.activity({ days, page, perPage }),
  });
}

export function useDashboardExpiring({ days = 30, page = 1, perPage = 10 } = {}) {
  return useQuery({
    queryKey: dashboardKeys.expiring({ days, page, perPage }),
    queryFn: () => dashboardApi.expiring({ days, page, perPage }),
  });
}

export function useDashboardRecentDocuments({ limit = 6 } = {}) {
  return useQuery({
    queryKey: [...dashboardKeys.recent, { limit }],
    queryFn: () => dashboardApi.recentDocuments({ limit }),
  });
}

export function useDashboardUploads({ months = 12 } = {}) {
  return useQuery({
    queryKey: dashboardKeys.uploads({ months }),
    queryFn: () => dashboardApi.uploads({ months }),
    staleTime: 5 * 60 * 1000,
  });
}

/** Readiness du service (encart admin) — rafraîchi régulièrement. */
export function useSystemReadiness() {
  return useQuery({
    queryKey: systemKeys.readiness,
    queryFn: () => dashboardApi.readiness(),
    refetchInterval: 60 * 1000,
  });
}

/** Version déployée (encart admin). */
export function useSystemVersion() {
  return useQuery({
    queryKey: systemKeys.version,
    queryFn: () => dashboardApi.version(),
    staleTime: 30 * 60 * 1000,
  });
}
