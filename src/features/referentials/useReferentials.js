/**
 * Hooks du domaine Référentiels (F3.7 lecture, F6.4 écriture admin).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useDepartments({ campusId } = {}) {
  return useQuery({
    queryKey: [...referentialsKeys.departments, campusId ?? null],
    queryFn: () => referentialsApi.departments({ campusId }),
    staleTime: STALE,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: referentialsKeys.roles,
    queryFn: referentialsApi.roles,
    staleTime: STALE,
  });
}

/** Invalide tous les référentiels après une écriture. */
function useReferentialMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: referentialsKeys.all }),
  });
}

export function useCreateDepartment() {
  return useReferentialMutation((payload) => referentialsApi.createDepartment(payload));
}

export function useUpdateDepartment() {
  return useReferentialMutation(({ id, payload }) =>
    referentialsApi.updateDepartment(id, payload)
  );
}

export function useDeleteDepartment() {
  return useReferentialMutation((id) => referentialsApi.deleteDepartment(id));
}

export function useCreateDocType() {
  return useReferentialMutation((payload) => referentialsApi.createDocType(payload));
}

export function useUpdateDocType() {
  return useReferentialMutation(({ id, payload }) => referentialsApi.updateDocType(id, payload));
}

export function useDeleteDocType() {
  return useReferentialMutation((id) => referentialsApi.deleteDocType(id));
}

export function useCreateTag() {
  return useReferentialMutation((payload) => referentialsApi.createTag(payload));
}

export function useDeleteTag() {
  return useReferentialMutation((id) => referentialsApi.deleteTag(id));
}

export function useCreateRole() {
  return useReferentialMutation((payload) => referentialsApi.createRole(payload));
}

export function useUpdateRole() {
  return useReferentialMutation(({ id, payload }) => referentialsApi.updateRole(id, payload));
}

export function useDeleteRole() {
  return useReferentialMutation((id) => referentialsApi.deleteRole(id));
}
