import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Providers globaux de l'application.
 * (Zustand n'a pas besoin de provider : les stores sont autonomes.)
 */
export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
