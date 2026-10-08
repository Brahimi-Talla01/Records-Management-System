import { createContext, useContext } from 'react';

/** Contexte du dialogue de confirmation (rempli par ConfirmProvider). */
export const ConfirmContext = createContext(null);

/** Accès impératif à la confirmation : `const confirm = useConfirm()`. */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>.');
  }
  return context;
}
