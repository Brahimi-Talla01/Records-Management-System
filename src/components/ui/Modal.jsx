import { useEffect, useId, useRef } from 'react';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

/**
 * Modale réutilisable (tokens uniquement, pas de couleur en dur).
 * Le contenu est scrollable ; l'overlay ferme au clic.
 *
 * Accessibilité : `role="dialog"` + `aria-modal`, titre relié par
 * `aria-labelledby`, focus déplacé à l'ouverture puis **piégé** dans la modale,
 * fermeture par Échap, focus restauré à l'élément déclencheur à la fermeture.
 */
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);

  // `onClose` arrive presque toujours en fonction inline (nouvelle identité à
  // chaque rendu du parent). L'effet de piégeage ne doit pas dépendre de cette
  // identité : sinon il se rejoue à chaque frappe et le focus saute hors du
  // champ en cours de saisie. On lit donc la dernière version via une ref.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    restoreRef.current = document.activeElement;
    const node = dialogRef.current;
    const focusables = () => Array.from(node?.querySelectorAll(FOCUSABLE) || []);

    // Focus initial : premier élément interactif, sinon la modale elle-même.
    const first = focusables()[0];
    (first || node)?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      restoreRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/40"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-card border border-border rounded-lg shadow-xl outline-none',
          SIZES[size] || SIZES.md
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id={titleId} className="font-heading font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
