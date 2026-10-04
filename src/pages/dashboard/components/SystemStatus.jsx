import Icon from '../../../components/AppIcon';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useSystemReadiness, useSystemVersion } from '../../../features/dashboard';
import { formatDate } from '../../../lib/formatters';

/** Code de vérification technique → libellé + variante de Badge + icône/classe. */
const CHECK = {
  ok: { label: 'OK', variant: 'success', icon: 'CheckCircle2', className: 'text-success' },
  skipped: { label: 'Non configuré', variant: 'neutral', icon: 'Circle', className: 'text-muted-foreground' },
  error: { label: 'Erreur', variant: 'error', icon: 'XCircle', className: 'text-error' },
};

const checkMeta = (value) => CHECK[value] || CHECK.skipped;

/**
 * État du système (encart admin) : readiness réelle (`GET /health/ready`) et
 * version déployée (`GET /api/version`). Plus aucune métrique inventée.
 */
const SystemStatus = ({ userRole }) => {
  const readiness = useSystemReadiness();
  const version = useSystemVersion();

  if (userRole !== 'admin') {
    return null;
  }

  if (readiness.isLoading || version.isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-6">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (readiness.isError) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card">
        <EmptyState
          icon="Server"
          iconClassName="text-error"
          title="État du système indisponible"
          description="La vérification de readiness n'a pas pu aboutir."
        />
      </div>
    );
  }

  const data = readiness.data;
  const checks = data?.checks || {};
  const ready = data?.status === 'ready';

  const metrics = [
    {
      id: 'database',
      label: 'Base de données',
      icon: 'Database',
      value:
        checks.database === 'ok'
          ? 'Opérationnel'
          : checks.database === 'skipped'
            ? 'Non vérifiée'
            : 'Indisponible',
      status: checks.database,
    },
    {
      id: 'redis',
      label: 'Cache (Redis)',
      icon: 'Server',
      value:
        checks.redis === 'ok'
          ? 'Opérationnel'
          : checks.redis === 'skipped'
            ? 'Non configuré'
            : 'Indisponible',
      status: checks.redis,
    },
    {
      id: 'service',
      label: 'État du service',
      icon: 'Activity',
      value: ready ? 'Opérationnel' : 'Dégradé',
      status: ready ? 'ok' : 'error',
    },
  ];

  const info = version.data;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Icon name="Activity" size={18} className="text-secondary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">État du système</h2>
              <p className="text-sm text-muted-foreground font-body">
                {ready ? 'Tous les services répondent' : 'Un service au moins est dégradé'}
              </p>
            </div>
          </div>
          <span className={`w-3 h-3 rounded-full ${ready ? 'bg-success' : 'bg-error'} animate-pulse`} />
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const meta = checkMeta(metric.status);
            return (
              <div key={metric.id} className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                      <Icon name={metric.icon} size={18} className="text-muted-foreground" />
                    </div>
                    <h4 className="text-sm font-body font-medium text-foreground">{metric.label}</h4>
                  </div>
                  <Icon name={meta.icon} size={16} className={meta.className} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-heading font-semibold text-foreground">
                    {metric.value}
                  </span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-body">
            <span>
              Version <span className="font-medium text-foreground">{info?.version || '—'}</span>
            </span>
            <span>
              Commit <span className="font-mono text-foreground">{info?.commit || 'unknown'}</span>
            </span>
            {info?.build_date && <span>Build du {formatDate(info.build_date)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
