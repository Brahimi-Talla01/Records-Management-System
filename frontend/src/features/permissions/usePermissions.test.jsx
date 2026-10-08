import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useDocumentGrants,
  useGrantDocumentUser,
  useRevokeDocumentRole,
} from './usePermissions';
import { permissionsApi } from './api';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoGrants } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('domaine permissions (F6.7)', () => {
  it('useDocumentGrants lit les accords utilisateurs et rôles', async () => {
    const { result } = setup(() => useDocumentGrants(1));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.users[0].can_view).toBe(true);
    expect(result.current.data.roles[0].role_id).toBe(2);
  });

  it('useDocumentGrants reste en attente sans identifiant', () => {
    const { result } = setup(() => useDocumentGrants(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useGrantDocumentUser accorde des droits sur un document', async () => {
    const { result } = setup(() => useGrantDocumentUser(1));

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        userId: 2,
        rights: { can_view: true, can_download: true, can_edit: false, can_delete: false },
      });
    });
    expect(data.message).toBe('Droits accordés.');
  });

  it('useRevokeDocumentRole révoque les droits d’un rôle', async () => {
    const { result } = setup(() => useRevokeDocumentRole(1));

    let data;
    await act(async () => {
      data = await result.current.mutateAsync(2);
    });
    expect(data.message).toBe('Droits révoqués.');
  });

  it('permissionsApi.check explique une décision', async () => {
    const result = await permissionsApi.check({
      object: 'document',
      id: 1,
      action: 'view',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('grant_user');
    expect(demoGrants.users).toHaveLength(1);
  });
});
