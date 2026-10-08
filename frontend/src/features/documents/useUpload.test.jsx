import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useCreateDocument, useAddDocumentVersion } from './useDocuments';
import { createTestQueryClient } from '../../test/renderWithProviders';

function wrapper(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const pdf = () => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'rapport.pdf');

describe('dépôt de documents (F4)', () => {
  it('crée un document avec son fichier (multipart)', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useCreateDocument(), { wrapper: wrapper(client) });

    let created;
    await act(async () => {
      created = await result.current.mutateAsync({
        payload: { title: 'Rapport annuel 2025', doc_type_id: 1 },
        file: pdf(),
      });
    });

    expect(created.document_id).toBe(1);
    expect(created.title).toBe('Rapport annuel 2025');
  });

  it('ajoute une version à un document existant (N+1)', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAddDocumentVersion(), { wrapper: wrapper(client) });

    let version;
    await act(async () => {
      version = await result.current.mutateAsync({ documentId: 1, file: pdf() });
    });

    expect(version.version_id).toBeDefined();
    expect(typeof version.version_number).toBe('number');
  });
});
