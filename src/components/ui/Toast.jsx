import React, { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import Icon from '../AppIcon';
import { ToastContext } from './useToast';

/**
 * Notifications non bloquantes (remplacent `alert()`).
 *
 * Usage : `const toast = useToast(); toast.success('Document enregistré')`.
 * Couleurs via tokens uniquement (`variant` → classes sémantiques).
 */
const VARIANTS = {
  success: { icon: 'CheckCircle2', className: 'border-success/40 bg-card text-foreground', iconClass: 'text-success' },
  error: { icon: 'AlertCircle', className: 'border-error/40 bg-card text-foreground', iconClass: 'text-error' },
  warning: { icon: 'AlertTriangle', className: 'border-warning/40 bg-card text-foreground', iconClass: 'text-warning' },
  info: { icon: 'Info', className: 'border-info/40 bg-card text-foreground', iconClass: 'text-info' },
  neutral: { icon: 'Bell', className: 'border-border bg-card text-foreground', iconClass: 'text-muted-foreground' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'neutral', { duration = 5000 } = {}) => {
      const id = ++counter.current;
      setToasts((current) => [...current, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: (message, options) => push(message, 'neutral', options),
      success: (message, options) => push(message, 'success', options),
      error: (message, options) => push(message, 'error', options),
      warning: (message, options) => push(message, 'warning', options),
      info: (message, options) => push(message, 'info', options),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-20 right-4 z-[1200] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const config = VARIANTS[t.variant] || VARIANTS.neutral;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 shadow-modal animate-slide-in-top',
                config.className
              )}
            >
              <Icon name={config.icon} size={18} className={cn('mt-0.5 shrink-0', config.iconClass)} />
              <p className="flex-1 text-sm font-body text-foreground">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fermer la notification"
              >
                <Icon name="X" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

