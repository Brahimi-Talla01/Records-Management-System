/**
 * Hooks TanStack Query du domaine Campus & institution (F6).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campusesApi, institutionApi } from './api';
import { campusesKeys, institutionKeys } from '../../lib/queryKeys';
import { useAuth, isSuperAdmin } from '../auth';
import { useCampusStore } from './campusStore';

/**
 * Périmètre de campus pour les écrans d'administration (A4) : liste des
 * campus, campus sélectionné, droit de sélection (super admin uniquement) et
 * libellé de repli pour les autres rôles.
 */
export function useCampusScope() {
  const { user } = useAuth();
  const canSelect = isSuperAdmin(user);
  const { campusId, setCampusId } = useCampusStore();
  const campusesQuery = useCampuses({ activeOnly: false });

  const ownCampusId = user?.campus_id ?? null;
  const effectiveCampusId = canSelect ? campusId : ownCampusId;
  const campuses = campusesQuery.data || [];
  const scopeName =
    user?.campus?.name || campuses.find((c) => c.campus_id === ownCampusId)?.name || 'Mon campus';

  return {
    canSelect,
    campusId: effectiveCampusId,
    setCampusId,
    campuses,
    campusesQuery,
    scopeName,
  };
}

export function useCampuses({ activeOnly = false } = {}) {
  return useQuery({
    queryKey: [...campusesKeys.all, { activeOnly }],
    queryFn: () => campusesApi.list({ activeOnly }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCampus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => campusesApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campusesKeys.all }),
  });
}

export function useUpdateCampus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campusId, payload }) => campusesApi.update(campusId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campusesKeys.all }),
  });
}

export function useSetCampusStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campusId, isActive }) => campusesApi.setStatus(campusId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campusesKeys.all }),
  });
}

export function useInstitution() {
  return useQuery({
    queryKey: institutionKeys.profile,
    queryFn: () => institutionApi.get(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => institutionApi.update(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: institutionKeys.all }),
  });
}
