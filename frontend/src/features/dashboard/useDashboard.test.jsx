import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useDashboardSummary,
  useDashboardActivity,
  useDashboardExpiring,
  useDashboardRecentDocuments,
  useDashboardUploads,
  useSystemReadiness,
  useSystemVersion,
} from './useDashboard';
import { createTestQueryClient } from '../../test/renderWithProviders';
import { demoSummary } from '../../mocks/handlers';

function wrapperFactory(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const setup = (hook) => {
  const client = createTestQueryClient();
  return { client, ...renderHook(hook, { wrapper: wrapperFactory(client) }) };
};

describe('hooks du tableau de bord (F2)', () => {
  it('useDashboardSummary valide et expose les totaux du rôle', async () => {
    const { result } = setup(() => useDashboardSummary());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.role).toBe('campus_admin');
    expect(result.current.data.totals.active).toBe(demoSummary.totals.active);
    expect(result.current.data.me.unread_notifications).toBe(1);
  });

  it('useDashboardSummary rejette un payload hors contrat (zod en frontière)', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('*/api/dashboard/summary', () => HttpResponse.json({ totals: {} }))
    );

    const { result } = setup(() => useDashboardSummary());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useDashboardActivity expose les entrées d’audit', async () => {
    const { result } = setup(() => useDashboardActivity({ perPage: 8 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].action).toBe('document_created');
    expect(result.current.data.days).toBe(30);
  });

  it('useDashboardExpiring expose les documents à échéance', async () => {
    const { result } = setup(() => useDashboardExpiring());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items).toHaveLength(1);
    expect(result.current.data.items[0].retention_expires_at).toBeTruthy();
  });

  it('useDashboardRecentDocuments expose items et limite', async () => {
    const { result } = setup(() => useDashboardRecentDocuments({ limit: 6 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].title).toBe('Rapport annuel 2025');
    expect(result.current.data.limit).toBe(6);
  });

  it('useDashboardUploads expose des mois à zéro rempli', async () => {
    const { result } = setup(() => useDashboardUploads());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.months).toHaveLength(2);
    expect(result.current.data.months[0].month).toBe('2026-09');
  });

  it('useSystemReadiness lit /health/ready hors /api', async () => {
    const { result } = setup(() => useSystemReadiness());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.status).toBe('ready');
    expect(result.current.data.checks.database).toBe('ok');
  });

  it('useSystemVersion expose la version déployée', async () => {
    const { result } = setup(() => useSystemVersion());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.version).toBe('1.0.0');
    expect(result.current.data.commit).toBe('abc1234');
  });
});
