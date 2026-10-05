import React from 'react';
import Icon from '../../../components/AppIcon';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatFileSize } from '../../../lib/formatters';

/** Tons autorisés (tokens uniquement) pour la pastille d'icône. */
const TONE = {
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-error text-error-foreground',
  info: 'bg-info text-info-foreground',
  accent: 'bg-accent text-accent-foreground',
};

/**
 * Cartes de synthèse issues de `GET /dashboard/summary`.
 * Les valeurs affichées sont celles de l'API : aucun chiffre de démonstration.
 * Le jeu de cartes dépend du `role` renvoyé par le serveur (super_admin,
 * campus_admin, user), donc le rôle réel n'est pas recalculé ici.
 */
const StatsOverview = ({ summary, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-card border border-border rounded-lg p-6 shadow-card">
            <Skeleton className="w-12 h-12 rounded-lg mb-4" />
            <Skeleton className="h-7 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const totals = summary?.totals;
  const recent = summary?.recent;
  const me = summary?.me;
  const isAdmin = summary?.role === 'super_admin' || summary?.role === 'campus_admin';

  const adminCards = [
    {
      id: 'active',
      label: 'Documents actifs',
      value: totals?.active ?? 0,
      icon: 'FileText',
      tone: 'info',
    },
    {
      id: 'documents',
      label: 'Documents (total)',
      value: totals?.documents ?? 0,
      icon: 'Files',
      tone: 'primary',
    },
    {
      id: 'storage',
      label: 'Stockage utilisé',
      value: formatFileSize(totals?.storage_bytes),
      icon: 'HardDrive',
      tone: 'accent',
    },
    {
      id: 'expiring',
      label: 'Échéances (30 j)',
      value: recent?.expiring ?? 0,
      icon: 'AlertTriangle',
      tone: 'warning',
    },
  ];

  const userCards = [
    {
      id: 'active',
      label: 'Documents accessibles',
      value: totals?.active ?? 0,
      icon: 'Eye',
      tone: 'info',
    },
    {
      id: 'uploads',
      label: 'Mes dépôts (30 j)',
      value: me?.uploads_30d ?? 0,
      icon: 'Upload',
      tone: 'success',
    },
    {
      id: 'unread',
      label: 'Notifications non lues',
      value: me?.unread_notifications ?? 0,
      icon: 'Bell',
      tone: 'error',
    },
  ];

  const cards = isAdmin ? adminCards : userCards;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((stat) => (
        <div
          key={stat.id}
          className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${TONE[stat.tone]} rounded-lg flex items-center justify-center`}>
              <Icon name={stat.icon} size={24} />
            </div>
            <span className="text-xs text-muted-foreground font-caption">
              {{ super_admin: 'Tous campus', campus_admin: 'Mon campus', user: 'Mon activité' }[
                summary?.role
              ] || ''}
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-1">{stat.value}</h3>
            <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
