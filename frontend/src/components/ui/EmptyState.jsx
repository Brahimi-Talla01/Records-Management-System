import React from 'react';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

/**
 * État vide standard (A9) : icône + titre + description + action optionnelle.
 * Aucune couleur locale : l'icône est colorée par une classe token passée via
 * `iconClassName` (par défaut neutre).
 */
const EmptyState = ({
  icon = 'Info',
  title = 'Aucun élément',
  description,
  action,
  iconClassName = 'text-muted-foreground',
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
    <Icon name={icon} size={32} className={cn('mb-3', iconClassName)} />
    <p className="font-body font-medium text-foreground">{title}</p>
    {description && (
      <p className="mt-1 max-w-sm text-sm font-body text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export { EmptyState };
export default EmptyState;
