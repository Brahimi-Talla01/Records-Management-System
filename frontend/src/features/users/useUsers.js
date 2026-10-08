/**
 * Hooks TanStack Query du domaine users.
 * Le filtrage et la pagination sont **serveur** (F6.5) : la page ne filtre
 * jamais localement, elle passe les filtres dans la requête.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './api';
import { usersKeys } from '../../lib/queryKeys';

export const USERS_PER_PAGE = 20;

export function useUsers({ page = 1, perPage = USERS_PER_PAGE, filters = {} } = {}) {
  return useQuery({
    queryKey: [...usersKeys.list({ page, filters }), perPage],
    queryFn: () => usersApi.list({ page, perPage, filters }),
    placeholderData: (prev) => prev, // garde la page précédente pendant le refetch
  });
}

export function useUserStatistics() {
  return useQuery({
    queryKey: usersKeys.statistics,
    queryFn: () => usersApi.statistics(),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: usersKeys.roles,
    queryFn: () => usersApi.roles(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: usersKeys.departments,
    queryFn: () => usersApi.departments(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => usersApi.create(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }) => usersApi.update(userId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => usersApi.remove(userId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useResetUserPassword() {
  return useMutation(({ userId, newPassword }) =>
    usersApi.resetPassword(userId, newPassword)
  );
}

export function useImportUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => usersApi.importCsv(file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}
