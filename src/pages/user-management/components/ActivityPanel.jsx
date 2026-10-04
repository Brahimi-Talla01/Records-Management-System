import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  getAlertSeverityMeta,
  getAuditActionMeta,
  formatRelativeTime,
} from '../../../lib/formatters';

/**
 * Panneau d'activité (F6.8) : journal **réel** (`GET /dashboard/activity`),
 * alertes de sécurité du compte et statistiques réelles (F6.5) — plus aucun
 * chiffre ou libellé factice.
 */
const ActivityPanel = ({
  activities = [],
  activitiesLoading = false,
  securityAlerts = [],
  onResolveAlert = null,
  onSeeAll = null,
}) => {
  const renderActivity = (activity) => {
    const meta = getAuditActionMeta(activity.action);
    return (
      <div
        key={activity.audit_id}
        className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Icon name={meta.icon} size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-foreground mb-0.5">{meta.label}</p>
            {activity.user && (
              <p className="text-xs text-muted-foreground font-caption">
                par {activity.user.full_name || activity.user.username}
              </p>
            )}
            <p className="text-xs text-muted-foreground font-caption">
              {formatRelativeTime(activity.created_at)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alertes de sécurité du compte connecté */}
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="p-4 border-b border-border flex items-center space-x-2">
          <Icon name="Shield" size={18} className="text-error" />
          <h3 className="font-heading font-medium text-foreground">Alertes de sécurité</h3>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {securityAlerts.length > 0 ? (
            securityAlerts.map((alert) => {
              const severity = getAlertSeverityMeta(alert.severity);
              return (
                <div key={alert.alert_id} className="p-4 border-b border-border last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Badge variant={severity.variant} className="mt-0.5 shrink-0">
                      {severity.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium text-sm text-foreground">
                        {alert.title}
                      </p>
                      <p className="text-sm text-muted-foreground font-body mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-caption">
                          {formatRelativeTime(alert.timestamp)}
                        </p>
                        {onResolveAlert && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-body"
                            onClick={() => onResolveAlert(alert.alert_id)}
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center">
              <Icon name="ShieldCheck" size={32} className="mx-auto text-success mb-2" />
              <p className="text-sm font-body text-muted-foreground">
                Aucune alerte de sécurité active
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activité récente (journal réel) */}
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon name="Activity" size={18} className="text-accent" />
            <h3 className="font-heading font-medium text-foreground">Activité récente</h3>
          </div>
          {onSeeAll && (
            <Button variant="ghost" size="sm" className="font-body" onClick={onSeeAll}>
              Voir tout
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {activitiesLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : activities.length > 0 ? (
            activities.map(renderActivity)
          ) : (
            <div className="p-6 text-center">
              <Icon name="Clock" size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-body text-muted-foreground">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;
