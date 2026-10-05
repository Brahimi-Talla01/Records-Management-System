import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';

/**
 * Rendu de test avec tous les providers applicatifs.
 * Le QueryClient est recréé à chaque appel (retry désactivé : un test ne doit
 * jamais attendre une reprise réseau).
 */
export function renderWithProviders(ui, { route = '/', queryClient, ...options } = {}) {
  const client =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ConfirmProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/** QueryClient isolé pour tester des hooks sans rendu. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}
