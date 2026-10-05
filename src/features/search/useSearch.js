/**
 * Hooks TanStack Query du domaine Recherche (F5).
 * La vue est pilotée par l'URL : aucune donnée serveur en useState (M12).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchApi } from './api';
import { searchKeys } from '../../lib/queryKeys';

/**
 * Recherche. `placeholderData` conserve les résultats précédents pendant le
 * chargement (pas de clignotement quand on affine les filtres).
 */
export function useSearch(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: searchKeys.results(params),
    queryFn: () => searchApi.search(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useSearchHistory(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: searchKeys.history(params),
    queryFn: () => searchApi.history(params),
    enabled,
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => searchApi.clearHistory(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: searchKeys.all }),
  });
}
