import Card, { CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Icon from '../../../components/AppIcon';
import { useSecurityAlerts, useResolveSecurityAlert } from '../../../features/auth';
import { useToast } from '../../../components/ui/useToast';
import { toAppError } from '../../../lib/errors';
import { getAlertSeverityMeta, formatRelativeTime } from '../../../lib/formatters';

/**
 * Alertes de sécurité du compte (`GET /auth/security-alerts`) et leur
 * résolution (`PUT /auth/security-alerts/<id>/resolve`).
 */
const SecurityAlertsCard = () => {
  const alertsQuery = useSecurityAlerts();
  const resolveAlert = useResolveSecurityAlert();
  const toast = useToast();

  const alerts = alertsQuery.data || [];

  const handleResolve = (alert) => {
    resolveAlert.mutate(alert.alert_id, {
      onSuccess: () => toast.success('Alerte marquée comme résolue.'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon name="Shield" size={18} className="text-error" />
          <CardTitle>Alertes de sécurité</CardTitle>
        </div>
        {alerts.length > 0 && <Badge variant="error">{alerts.length}</Badge>}
      </CardHeader>
      <CardContent>
        {alertsQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!alertsQuery.isLoading && alerts.length === 0 && (
          <EmptyState
            icon="ShieldCheck"
            iconClassName="text-success"
            title="Aucune alerte active"
            description="Les tentatives de connexion suspectes ou échouées apparaîtront ici."
          />
        )}

        {alerts.length > 0 && (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => {
              const severity = getAlertSeverityMeta(alert.severity);
              return (
                <li
                  key={alert.alert_id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant={severity.variant}>{severity.label}</Badge>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-foreground">{alert.message}</p>
                      <p className="mt-1 text-xs font-caption text-muted-foreground">
                        {alert.alert_type ? `${alert.alert_type} · ` : ''}
                        {alert.created_at ? formatRelativeTime(alert.created_at) : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Check"
                    iconPosition="left"
                    className="sm:shrink-0"
                    onClick={() => handleResolve(alert)}
                    loading={resolveAlert.isPending && resolveAlert.variables === alert.alert_id}
                  >
                    Résoudre
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityAlertsCard;
