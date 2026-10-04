/** Hooks TanStack Query du domaine dossiers (F3). */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersApi } from './api';
import { foldersKeys, documentsKeys } from '../../lib/queryKeys';

export function useFolderTree({ enabled = true } = {}) {
  return useQuery({
    queryKey: foldersKeys.tree({}),
    queryFn: () => foldersApi.list({ tree: true }),
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useFolderPath(folderId) {
  return useQuery({
    queryKey: foldersKeys.path(folderId),
    queryFn: () => foldersApi.path(folderId),
    enabled: Boolean(folderId),
  });
}

function useInvalidateFolders() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: foldersKeys.all });
    queryClient.invalidateQueries({ queryKey: documentsKeys.all });
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({ mutationFn: (payload) => foldersApi.create(payload), onSuccess: invalidate });
}

export function useUpdateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ folderId, payload }) => foldersApi.update(folderId, payload),
    onSuccess: invalidate,
  });
}

export function useMoveFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ folderId, parentFolderId }) => foldersApi.move(folderId, parentFolderId),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (folderId) => foldersApi.remove(folderId),
    onSuccess: invalidate,
  });
}
