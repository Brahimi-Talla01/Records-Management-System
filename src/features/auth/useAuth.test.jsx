import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useAuthStore } from './authStore';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoUser } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('charge la session via GET /auth/me', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFactory(client) });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user.username).toBe(demoUser.username);
  });

  it('expose login et verify2FA comme mutations', () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFactory(client) });
    expect(typeof result.current.login.mutateAsync).toBe('function');
    expect(typeof result.current.verify2FA.mutateAsync).toBe('function');
  });

  it('logout purge le store (session révoquée)', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFactory(client) });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => {
      await result.current.logout.mutateAsync();
    });
    // Le store client est vidé ; le cache Query est purgé puis le query actif
    // (encore monté) peut revalider — on vérifie donc l'état du store.
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('guest');
  });

  it('un 401 sur /auth/me laisse l’utilisateur non authentifié', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ error: 'Non authentifié', code: 'unauthorized' }, { status: 401 })
      )
    );
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFactory(client) });

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.isAuthenticated).toBe(false);
  });
});
