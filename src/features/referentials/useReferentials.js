/** Hooks de lecture des référentiels (F3.7) — listes quasi figées. */
import { useQuery } from '@tanstack/react-query';
import { referentialsApi } from './api';
import { referentialsKeys } from '../../lib/queryKeys';

const STALE = 5 * 60 * 1000;

export function useDocTypes() {
  return useQuery({
    queryKey: referentialsKeys.docTypes,
    queryFn: referentialsApi.docTypes,
    staleTime: STALE,
  });
}

export function useTags() {
  return useQuery({
    queryKey: referentialsKeys.tags,
    queryFn: referentialsApi.tags,
    staleTime: STALE,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: referentialsKeys.departments,
    queryFn: referentialsApi.departments,
    staleTime: STALE,
  });
}
