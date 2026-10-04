import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useDocuments,
  useDocument,
  useDocumentPermissions,
  useBulkDocuments,
  useDeleteDocument,
  useRestoreDocument,
  useRestoreVersion,
  useAddDocumentTags,
} from './useDocuments';
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

describe('hooks des documents (F3)', () => {
  it('useDocuments expose la pagination offset du backend', async () => {
    const { result } = setup(() => useDocuments({ page: 1 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items).toHaveLength(1);
    expect(result.current.data.total).toBe(1);
    expect(result.current.data.pages).toBe(1);
  });

  it('useDocuments rejette une liste hors contrat', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/documents', () => HttpResponse.json({ rows: [] })));

    const { result } = setup(() => useDocuments({ page: 1 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.name).toBe('ApiContractError');
  });

  it('useDocument lit le détail avec ses versions', async () => {
    const { result } = setup(() => useDocument(1));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.document_id).toBe(1);
    expect(result.current.data.versions).toHaveLength(2);
    expect(result.current.data.versions[0].version_number).toBe(2);
  });

  it('useDocument reste inactif sans identifiant', () => {
    const { result } = setup(() => useDocument(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useDocumentPermissions expose les droits effectifs', async () => {
    const { result } = setup(() => useDocumentPermissions(1));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.effective.download.allowed).toBe(true);
    expect(result.current.data.effective.delete.allowed).toBe(false);
  });

  it('useBulkDocuments appelle POST /documents/bulk', async () => {
    const { result } = setup(() => useBulkDocuments());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ ids: [1], action: 'delete' });
    });
    expect(data.updated).toEqual([1]);
  });

  it('useDeleteDocument / useRestoreDocument répondent par le détail', async () => {
    const del = setup(() => useDeleteDocument());
    let removed;
    await act(async () => {
      removed = await del.result.current.mutateAsync(1);
    });
    expect(removed.status).toBe('active');

    const restore = setup(() => useRestoreDocument());
    await act(async () => {
      await restore.result.current.mutateAsync(1);
    });
    expect(restore.result.current.isSuccess).toBe(true);
  });

  it('useRestoreVersion replie sur la version demandée', async () => {
    const { result } = setup(() => useRestoreVersion());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ documentId: 1, versionId: 10 });
    });
    expect(data.version_number).toBe(1);
  });

  it("useAddDocumentTags étiquette le document", async () => {
    const { result } = setup(() => useAddDocumentTags());

    let data;
    await act(async () => {
      data = await result.current.mutateAsync({ documentId: 1, tags: ['IA'] });
    });
    expect(data.document_id).toBe(1);
  });
});
