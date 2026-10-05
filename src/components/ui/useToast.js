import { createContext, useContext } from 'react';

/** Contexte des notifications non bloquantes (rempli par ToastProvider). */
export const ToastContext = createContext(null);

/** Accès impératif aux notifications : `const toast = useToast()`. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  }
  return context;
}
