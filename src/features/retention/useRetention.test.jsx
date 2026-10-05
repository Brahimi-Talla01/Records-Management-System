import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useRetentionStatus, useRetentionReports, useRunRetention } from './useRetention';
import { retentionApi } from './api';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoRetentionStatus, demoRetentionReport } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('domaine rétention (F6.9)', () => {
  it('useRetentionStatus expose le statut du cycle', async () => {
    const { result } = setup(() => useRetentionStatus());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.enabled).toBe(demoRetentionStatus.enabled);
    expect(result.current.data.warning_days).toBe(demoRetentionStatus.warning_days);
  });

  it('retentionApi.run envoie dry_run: true par défaut (jamais d’écriture sans confirmation)', async () => {
    let payload = null;
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.post('*/api/admin/retention/run', async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json(demoRetentionReport);
      })
    );

    const report = await retentionApi.run();
    expect(payload).toEqual({ dry_run: true });
    expect(report.dry_run).toBe(true);
  });

  it('useRetentionReports lit l’historique paginé', async () => {
    const { result } = setup(() => useRetentionReports());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].report_id).toBe(demoRetentionReport.report_id);
  });

  it('useRunRetention exécute un cycle et invalide le statut', async () => {
    const { result } = setup(() => useRunRetention());

    let report;
    await act(async () => {
      report = await result.current.mutateAsync({ dryRun: false });
    });
    expect(report.archived).toBe(2);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
