import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { permissionsApi } from './api';
import { permissionsKeys } from '../../lib/queryKeys';

export function useDocumentGrants(documentId, { enabled = true } = {}) {
  return useQuery({
    queryKey: permissionsKeys.documentGrants(documentId),
    queryFn: () => permissionsApi.documentGrants(documentId),
    enabled: Boolean(documentId) && enabled,
  });
}

function useInvalidateGrants(documentId) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: permissionsKeys.documentGrants(documentId) });
}

export function useGrantDocumentUser(documentId) {
  const invalidate = useInvalidateGrants(documentId);
  return useMutation({
    mutationFn: ({ userId, rights }) => permissionsApi.grantDocumentUser(documentId, userId, rights),
    onSuccess: invalidate,
  });
}

export function useRevokeDocumentUser(documentId) {
  const invalidate = useInvalidateGrants(documentId);
  return useMutation({
    mutationFn: (userId) => permissionsApi.revokeDocumentUser(documentId, userId),
    onSuccess: invalidate,
  });
}

export function useGrantDocumentRole(documentId) {
  const invalidate = useInvalidateGrants(documentId);
  return useMutation({
    mutationFn: ({ roleId, rights }) => permissionsApi.grantDocumentRole(documentId, roleId, rights),
    onSuccess: invalidate,
  });
}

export function useRevokeDocumentRole(documentId) {
  const invalidate = useInvalidateGrants(documentId);
  return useMutation({
    mutationFn: (roleId) => permissionsApi.revokeDocumentRole(documentId, roleId),
    onSuccess: invalidate,
  });
}
