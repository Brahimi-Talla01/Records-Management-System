import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';

/**
 * Providers globaux de l'application.
 * (Zustand n'a pas besoin de provider : les stores sont autonomes.)
 */
export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
