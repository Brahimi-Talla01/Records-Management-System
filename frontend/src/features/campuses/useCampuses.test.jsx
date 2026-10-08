import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useCampuses,
  useInstitution,
  useSetCampusStatus,
} from './useCampuses';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoInstitution } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('hooks du domaine campuses (F6.1)', () => {
  it('useCampuses liste les campus avec leurs statistiques', async () => {
    const { result } = setup(() => useCampuses());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].code).toBe('PRINCIPAL');
    expect(result.current.data[0].stats.users).toBe(34);
  });

  it('useCampuses rejette une liste hors contrat (zod)', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/campuses', () => HttpResponse.json({ campuses: [{ id: 1 }] })));

    const { result } = setup(() => useCampuses());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useSetCampusStatus traduit le 409 campus_not_empty', async () => {
    const { result } = setup(() => useSetCampusStatus());

    let error = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({ campusId: 1, isActive: false });
      } catch (err) {
        error = err;
      }
    });
    expect(error?.response?.status).toBe(409);
    expect(error?.response?.data?.code).toBe('campus_not_empty');
    expect(error?.response?.data?.details.users).toBe(34);
  });

  it('useInstitution lit le profil de l’établissement', async () => {
    const { result } = setup(() => useInstitution());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.name).toBe(demoInstitution.name);
    expect(result.current.data.timezone).toBe(demoInstitution.timezone);
  });
});
