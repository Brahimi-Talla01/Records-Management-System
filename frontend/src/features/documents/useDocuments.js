/**
 * Hooks TanStack Query du domaine documents (F3).
 * La liste est pilotée par l'URL côté page : on ne garde aucune donnée
 * serveur en useState (règle M12).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from './api';
import { documentsKeys, foldersKeys } from '../../lib/queryKeys';

export function useDocuments(params = {}) {
  return useQuery({
    queryKey: documentsKeys.list(params),
    queryFn: () => documentsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useDocument(documentId, { enabled = true } = {}) {
  return useQuery({
    queryKey: documentsKeys.detail(documentId),
    queryFn: () => documentsApi.get(documentId),
    enabled: Boolean(documentId) && enabled,
  });
}

export function useDocumentVersions(documentId, { enabled = true } = {}) {
  return useQuery({
    queryKey: documentsKeys.versions(documentId),
    queryFn: () => documentsApi.versions(documentId),
    enabled: Boolean(documentId) && enabled,
  });
}

export function useDocumentPermissions(documentId, { enabled = true } = {}) {
  return useQuery({
    queryKey: documentsKeys.permissions(documentId),
    queryFn: () => documentsApi.permissions(documentId),
    enabled: Boolean(documentId) && enabled,
  });
}

/** Invalide liste + détail + arborescence après toute mutation. */
function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: documentsKeys.all });
    queryClient.invalidateQueries({ queryKey: foldersKeys.all });
  };
}

export function useUpdateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ documentId, payload }) => documentsApi.update(documentId, payload),
    onSuccess: invalidate,
  });
}

/** Création d'un document + fichier (v1) — dépôt F4. */
export function useCreateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ payload, file, onUploadProgress, signal }) =>
      documentsApi.create(payload, { file, onUploadProgress, signal }),
    onSuccess: invalidate,
  });
}

/** Ajout d'une version à un document existant (N+1) — F4. */
export function useAddDocumentVersion() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ documentId, file, changeNote, onUploadProgress, signal }) =>
      documentsApi.addVersion(documentId, file, { changeNote, onUploadProgress, signal }),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (documentId) => documentsApi.remove(documentId),
    onSuccess: invalidate,
  });
}

export function useRestoreDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (documentId) => documentsApi.restore(documentId),
    onSuccess: invalidate,
  });
}

export function useBulkDocuments() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: (payload) => documentsApi.bulk(payload),
    onSuccess: invalidate,
  });
}

export function useRestoreVersion() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ documentId, versionId }) =>
      documentsApi.restoreVersion(documentId, versionId),
    onSuccess: invalidate,
  });
}

export function useAddDocumentTags() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ documentId, tags }) => documentsApi.addTags(documentId, tags),
    onSuccess: invalidate,
  });
}

export function useRemoveDocumentTags() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: ({ documentId, tags }) => documentsApi.removeTags(documentId, tags),
    onSuccess: invalidate,
  });
}
