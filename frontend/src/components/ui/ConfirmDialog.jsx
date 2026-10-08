import React, { useCallback, useRef, useState } from 'react';
import Button from './Button';
import { ConfirmContext } from './useConfirm';

/**
 * Confirmation modale (remplace `window.confirm`).
 *
 * Usage : `const confirm = useConfirm();`
 *         `if (await confirm({ title, description, confirmLabel, variant })) { … }`
 */

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, options: {} });
  const resolver = useRef(null);

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState({ open: true, options });
      }),
    []
  );

  const close = useCallback((result) => {
    setState((current) => ({ ...current, open: false }));
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const { open, options } = state;
  const {
    title = 'Confirmation',
    description = '',
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'danger',
  } = options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-foreground/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mb-6 text-sm font-body text-muted-foreground">{description}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {cancelLabel}
              </Button>
              <Button variant={variant} onClick={() => close(true)}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

