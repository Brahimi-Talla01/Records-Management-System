import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

/**
 * Modale réutilisable (tokens uniquement, pas de couleur en dur).
 * Le contenu est scrollable ; l'overlay ferme au clic.
 */
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="fixed inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-card border border-border rounded-lg shadow-xl',
          SIZES[size] || SIZES.md
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading font-semibold text-foreground">{title}</h2>
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
