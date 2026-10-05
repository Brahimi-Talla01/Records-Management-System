import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from './useNotifications';
import { createTestQueryClient } from '../../test/renderWithProviders';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('hooks des notifications (F2)', () => {
  it('useNotifications expose les items et le compteur non-lu', async () => {
    const { result } = setup(() => useNotifications());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].title).toBe('Nouveau document déposé');
    expect(result.current.data.unread).toBe(1);
  });

  it('useUnreadNotificationsCount lit le badge', async () => {
    const { result } = setup(() => useUnreadNotificationsCount());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(1);
  });

  it('useUnreadNotificationsCount rejette un payload hors contrat', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('*/api/notifications/unread-count', () => HttpResponse.json({ count: 3 }))
    );

    const { result } = setup(() => useUnreadNotificationsCount());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useMarkNotificationRead appelle PATCH …/read', async () => {
    const { result } = setup(() => useMarkNotificationRead());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(1);
    });
    expect(data.notification_id).toBe(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useMarkAllNotificationsRead renvoie le nombre mis à jour', async () => {
    const { result } = setup(() => useMarkAllNotificationsRead());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync();
    });
    expect(data.updated).toBe(1);
  });

  it('useDeleteNotification appelle DELETE /notifications/:id', async () => {
    const { result } = setup(() => useDeleteNotification());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(1);
    });
    expect(data.deleted).toBe(true);
  });
});
