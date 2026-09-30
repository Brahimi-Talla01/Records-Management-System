import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient global TanStack Query.
 * - staleTime 30s : évite les refetch au remount
 * - retry désactivé sur 401/403/404 (inutile de réessayer)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if ([401, 403, 404].includes(status)) return false;
        return failureCount < 2;
    },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
