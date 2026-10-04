import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFolderTree,
  useFolderPath,
  useCreateFolder,
  useMoveFolder,
  useDeleteFolder,
} from './useFolders';
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

describe('hooks des dossiers (F3)', () => {
  it('useFolderTree expose le nœud racine', async () => {
    const { result } = setup(() => useFolderTree());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].name).toBe('Thèses');
    expect(result.current.data[0].folder_id).toBe(5);
  });

  it('useFolderPath construit le fil d’Ariane', async () => {
    const { result } = setup(() => useFolderPath(5));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].folder_id).toBe(5);
  });

  it('useFolderPath reste inactif sans dossier courant', () => {
    const { result } = setup(() => useFolderPath(null));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useCreateFolder crée le dossier', async () => {
    const { result } = setup(() => useCreateFolder());

    let created;
    await act(async () => {
      created = await result.current.mutateAsync({ name: 'Thèses' });
    });
    expect(created.folder_id).toBe(5);
    expect(created.name).toBe('Thèses');
  });

  it('useMoveFolder envoie le parent demandé', async () => {
    const { result } = setup(() => useMoveFolder());

    let moved;
    await act(async () => {
      moved = await result.current.mutateAsync({ folderId: 6, parentFolderId: 5 });
    });
    expect(moved.folder_id).toBe(5);
  });

  it('useDeleteFolder propage le 409 « dossier non vide »', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.delete('*/api/folders/:id', () =>
        HttpResponse.json(
          {
            error: 'Dossier non vide : déplacez ou supprimez son contenu.',
            code: 'folder_not_empty',
            details: { children: 1, documents: 2 },
          },
          { status: 409 }
        )
      )
    );

    const { result } = setup(() => useDeleteFolder());
    await act(async () => {
      await expect(result.current.mutateAsync(5)).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });
});
