import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSearch, useSearchHistory, useClearSearchHistory } from './useSearch';
import { createTestQueryClient } from '../../test/renderWithProviders';

function wrapper(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('hooks de recherche (F5)', () => {
  it('renvoie résultats, facettes et durée', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSearch({ q: 'rapport' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items[0].document_id).toBe(1);
    expect(result.current.data.took_ms).toBe(12.5);
    expect(result.current.data.facets.doc_types[0].count).toBe(1);
  });

  it('n’interroge pas le serveur quand la recherche est désactivée', () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSearch({}, { enabled: false }), {
      wrapper: wrapper(client),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.isLoading).toBe(false);
  });

  it('charge puis vide l’historique', async () => {
    const client = createTestQueryClient();
    const history = renderHook(() => useSearchHistory({ per_page: 10 }), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(history.result.current.isSuccess).toBe(true));
    expect(history.result.current.data.items[0].query).toBe('rapport');

    const clear = renderHook(() => useClearSearchHistory(), { wrapper: wrapper(client) });
    await act(async () => {
      await clear.result.current.mutateAsync();
    });
    await waitFor(() => expect(clear.result.current.status).toBe('success'));
  });
});
