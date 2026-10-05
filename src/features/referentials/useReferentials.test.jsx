import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useRoles,
  useDepartments,
  useCreateDepartment,
  useDeleteRole,
} from './useReferentials';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoRoles, demoDepartments } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('référentiels en écriture (F6.4)', () => {
  it('useRoles lit la liste des rôles (admin)', async () => {
    const { result } = setup(() => useRoles());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(demoRoles.length);
    expect(result.current.data[0].name).toBe('Admin');
  });

  it('useDepartments lit les départements du périmètre', async () => {
    const { result } = setup(() => useDepartments({ campusId: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].code).toBe(demoDepartments[0].code);
  });

  it('useCreateDepartment crée un département (POST 201)', async () => {
    const { result } = setup(() => useCreateDepartment());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({
        name: 'Chimie',
        code: 'CHIM',
        description: null,
      });
    });
    expect(data.code).toBe('MATH'); // fixture renvoyée par MSW
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('useDeleteRole expose le 409 role_in_use du serveur', async () => {
    const { result } = setup(() => useDeleteRole());

    let error = null;
    await act(async () => {
      try {
        await result.current.mutateAsync(2);
      } catch (err) {
        error = err;
      }
    });
    expect(error?.response?.data?.code).toBe('role_in_use');
    expect(error?.response?.data?.details.users).toBe(6);
  });
});
