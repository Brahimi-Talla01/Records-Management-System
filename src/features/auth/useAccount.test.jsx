import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useSessions,
  useSecurityAlerts,
  useResolveSecurityAlert,
  useChangePassword,
  useResetPassword,
  useEnable2FA,
  useConfirm2FA,
  useDisable2FA,
  useAuth,
} from './useAuth';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoAlert } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('hooks du compte (F1)', () => {
  it('useSessions valide la réponse et expose les sessions', async () => {
    const { result } = setup(() => useSessions());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].session_id).toBe('abc12345…');
    expect(result.current.data[0].ip).toBe('127.0.0.1');
  });

  it('useSessions rejette un payload hors contrat (zod en frontière)', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('*/api/auth/sessions', () =>
        HttpResponse.json({ sessions: [{ ip: '1.2.3.4' }] })
      )
    );

    const { result } = setup(() => useSessions());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useSecurityAlerts renvoie les alertes du compte', async () => {
    const { result } = setup(() => useSecurityAlerts());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].alert_id).toBe(demoAlert.alert_id);
    expect(result.current.data[0].severity).toBe('high');
  });

  it('useResolveSecurityAlert appelle PUT …/resolve', async () => {
    const { result } = setup(() => useResolveSecurityAlert());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(demoAlert.alert_id);
    });
    expect(data.message).toMatch(/résolue/i);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useChangePassword transmet les deux mots de passe', async () => {
    const { result } = setup(() => useChangePassword());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ currentPassword: 'Ancien1', newPassword: 'Nouveau1' });
    });
    expect(data.message).toMatch(/mot de passe/i);
  });

  it('useResetPassword transmet le token et le nouveau mot de passe', async () => {
    const { result } = setup(() => useResetPassword());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ token: 'jeton', newPassword: 'Nouveau1' });
    });
    expect(data.message).toMatch(/réinitialisé/i);
  });

  it('les mutations 2FA passent par les trois endpoints dédiés', async () => {
    const enable = setup(() => useEnable2FA());
    let enabled;
    await act(async () => {
      enabled = await enable.result.current.mutateAsync();
    });
    expect(enabled.message).toMatch(/code/i);

    const confirm = setup(() => useConfirm2FA());
    let confirmed;
    await act(async () => {
      confirmed = await confirm.result.current.mutateAsync('123456');
    });
    expect(confirmed.message).toMatch(/2FA/i);

    const disable = setup(() => useDisable2FA());
    let disabled;
    await act(async () => {
      disabled = await disable.result.current.mutateAsync();
    });
    expect(disabled.message).toMatch(/désactivé/i);
  });

  it('useAuth expose two_fa_enabled depuis le profil', async () => {
    const { result } = setup(() => useAuth());

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user.two_fa_enabled).toBe(true);
  });
});
