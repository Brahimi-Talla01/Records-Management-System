import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useUsers,
  useUserStatistics,
  useDeleteUser,
  useImportUsers,
} from './useUsers';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoUserStats } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('hooks du domaine users (F6.5)', () => {
  it('useUsers renvoie la liste paginée et la pagination serveur', async () => {
    const { result } = setup(() => useUsers({ page: 1, filters: { search: 'admin' } }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.users.length).toBeGreaterThan(0);
    expect(result.current.data.total).toBe(result.current.data.users.length);
  });

  it('useUserStatistics expose les compteurs réels', async () => {
    const { result } = setup(() => useUserStatistics());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.total).toBe(demoUserStats.total);
    expect(result.current.data.active).toBe(demoUserStats.active);
  });

  it('useUserStatistics rejette un payload hors contrat (zod)', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/users/statistics', () => HttpResponse.json({ total: 'n' })));

    const { result } = setup(() => useUserStatistics());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useDeleteUser appelle DELETE /users/:id (soft delete)', async () => {
    const { result } = setup(() => useDeleteUser());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(2);
    });
    expect(data.message).toBe('Compte désactivé.');
  });

  it('useImportUsers lit le rapport ligne à ligne', async () => {
    const { result } = setup(() => useImportUsers());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(new File(['id'], 'users.csv'));
    });
    expect(data.success).toBe(1);
    expect(data.errors[0].row).toBe(3);
    expect(data.errors[0].error).toBe('Rôle invalide');
  });
});
