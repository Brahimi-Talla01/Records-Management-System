import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Placeholder de chargement : une forme neutre le temps qu'une donnée arrive.
 * Utilisé pour les cartes et les listes (état « chargement » de A9).
 */
const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('animate-pulse rounded-md bg-muted', className)}
    aria-hidden="true"
    {...props}
  />
));

Skeleton.displayName = 'Skeleton';

export { Skeleton };
export default Skeleton;
