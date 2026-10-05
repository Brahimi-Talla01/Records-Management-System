import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuditEntries } from './useAudit';
import { toAuditParams } from './api';
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

describe('domaine audit (F6.8)', () => {
  it('toAuditParams omet les filtres vides et transmet les autres', () => {
    expect(toAuditParams({ action: '', from: undefined, page: 2 })).toEqual({ page: 2 });
    expect(toAuditParams({ action: 'document_created', object_type: 'document', page: 1 })).toEqual(
      { action: 'document_created', object_type: 'document', page: 1 }
    );
  });

  it('useAuditEntries lit le journal paginé', async () => {
    const { result } = setup(() =>
      useAuditEntries({ action: 'document_created', page: 1 })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].action).toBe('document_created');
    expect(result.current.data.items[0].user.username).toBe('admin.demo');
  });

  it('useAuditEntries rejette un payload hors contrat (zod)', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/audit', () => HttpResponse.json({ entries: [] })));

    const { result } = setup(() => useAuditEntries({}));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });
});
