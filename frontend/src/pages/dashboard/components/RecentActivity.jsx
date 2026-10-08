import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { getAuditActionMeta, formatRelativeTime } from '../../../lib/formatters';

/** Classe token de la pastille d'icône selon la nature de l'action. */
function toneForAction(action = '') {
  if (/(deleted|purged|denied|failed|revoked)/.test(action)) return 'bg-error text-error-foreground';
  if (/(created|uploaded|granted|restored|enabled|success)/.test(action)) {
    return 'bg-success text-success-foreground';
  }
  if (/(updated|moved|archived|warning|changed)/.test(action)) {
    return 'bg-warning text-warning-foreground';
  }
  return 'bg-info text-info-foreground';
}

/** Description lisible : titre du document si présent, sinon objet#id. */
function describeEntry(entry) {
  const details = entry?.details;
  if (details && typeof details === 'object') {
    if (details.title) return details.title;
    if (details.query) return `« ${details.query} »`;
  }
  if (entry?.object_type) {
    return `${entry.object_type}${entry.object_id ? ` #${entry.object_id}` : ''}`;
  }
  return '—';
}

/**
 * Fil d'activité alimenté par `GET /dashboard/activity` (journal d'audit borné
 * au périmètre du rôle). Les actions techniques sont traduites par
 * `getAuditActionMeta`, jamais affichées brutes.
 */
const RecentActivity = ({ activities = [], isLoading = false, showViewAll = false }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Icon name="Activity" size={18} className="text-accent-foreground" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Activité récente</h2>
          </div>
          {showViewAll && (
            <Button
              variant="ghost"
              size="sm"
              iconName="ExternalLink"
              iconPosition="right"
              iconSize={14}
              onClick={() => navigate('/user-management')}
              className="text-muted-foreground hover:text-foreground font-body"
            >
              Voir tout
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="Clock"
          title="Aucune activité récente"
          description="Les actions réalisées sur votre périmètre apparaîtront ici."
        />
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {activities.slice(0, 8).map((activity, index) => {
            const meta = getAuditActionMeta(activity?.action);
            const author = activity?.user?.full_name || activity?.user?.username;
            return (
              <div
                key={activity?.audit_id ?? index}
                className={`p-4 hover:bg-muted transition-colors duration-200 ${
                  index !== Math.min(activities.length, 8) - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-10 h-10 ${toneForAction(activity?.action)} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon name={meta.icon} size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-body font-medium text-foreground truncate">
                        {meta.label}
                      </h4>
                      <span className="text-xs text-muted-foreground font-caption flex-shrink-0 ml-2">
                        {formatRelativeTime(activity?.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground font-body mb-2 line-clamp-2">
                      {describeEntry(activity)}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-caption">
                        Par {author || 'Système'}
                      </span>
                      <Badge variant="neutral" className="font-caption">
                        {activity?.object_type || 'audit'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
