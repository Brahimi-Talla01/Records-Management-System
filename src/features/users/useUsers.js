/**
 * Hooks TanStack Query du domaine users.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './api';

export const USERS_KEY = ['users'];

export function useUsers({ page = 1, perPage = 20, filters = {} } = {}) {
  return useQuery({
    queryKey: [...USERS_KEY, { page, perPage, filters }],
    queryFn: () => usersApi.list({ page, perPage, filters }),
    placeholderData: (prev) => prev, // garde les données pendant le changement de page
  });
}

export function useUserStatistics() {
  return useQuery({
    queryKey: ['users', 'statistics'],
    queryFn: () => usersApi.statistics(),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['users', 'roles'],
    queryFn: () => usersApi.roles(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['users', 'departments'],
    queryFn: () => usersApi.departments(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => usersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }) => usersApi.update(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => usersApi.remove(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }) => usersApi.resetPassword(userId, newPassword),
  });
}

export function useImportUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => usersApi.importCsv(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}
