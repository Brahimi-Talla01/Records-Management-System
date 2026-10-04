/**
 * Rétention des archives (F6.9, super admin) — statut du cycle, exécution
 * d'abord en **simulation** (`dry_run: true`), exécution réelle uniquement
 * après double confirmation, historique des rapports.
 */
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { useAuth } from '../../features/auth';
import { mapBackendRole, formatDateTime } from '../../lib/formatters';
import {
  useRetentionStatus,
  useRetentionReports,
  useRunRetention,
} from '../../features/retention';
import { toAppError } from '../../lib/errors';

const StatCard = ({ icon, label, value }) => (
  <div className="bg-card border border-border rounded-lg shadow-card p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon name={icon} size={16} className="text-muted-foreground" />
      <span className="text-xs font-caption text-muted-foreground">{label}</span>
    </div>
    <p className="text-2xl font-heading font-semibold text-foreground">{value ?? '—'}</p>
  </div>
);

const Retention = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  const statusQuery = useRetentionStatus();
  const reportsQuery = useRetentionReports();
  const runRetention = useRunRetention();

  const status = statusQuery.data;

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte
    } finally {
      navigate('/login');
    }
  };

  const runCycle = async (dryRun) => {
    if (!dryRun) {
      const first = await confirm({
        title: 'Exécuter le cycle de rétention',
        description:
          'Le cycle va archiver puis purger les documents expirés. Cette action est irréversible. Continuer ?',
        confirmLabel: 'Continuer',
        variant: 'danger',
      });
      if (!first) return;
      const second = await confirm({
        title: 'Confirmer la purge',
        description: `Dernière confirmation : exécuter la purge réelle (préavis ${status?.warning_days ?? '?'} j, purge après ${status?.purge_after_days ?? '?'} j).`,
        confirmLabel: 'Exécuter',
        variant: 'danger',
      });
      if (!second) return;
    }
    try {
      const report = await runRetention.mutateAsync({ dryRun });
      toast.success(
        dryRun
          ? `Simulation terminée : ${report.archived ?? 0} archivage(s), ${report.purged ?? 0} purge(s) si exécutée.`
          : `Cycle exécuté : ${report.archived ?? 0} archivage(s), ${report.purged ?? 0} purge(s).`
      );
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const reports = reportsQuery.data?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold text-foreground">Rétention</h1>
            <p className="font-body text-muted-foreground mt-2">
              Cycle d'archivage et de purge des documents arrivés à échéance (réservé au super admin).
            </p>
          </div>

          {statusQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {/* Statut */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon="AlertTriangle" label="Échéance proche" value={status?.expiring_soon} />
                <StatCard icon="Clock" label="Expirés actifs" value={status?.expired_active} />
                <StatCard icon="Archive" label="Archivés" value={status?.archived} />
                <StatCard icon="Trash2" label="Purgeables" value={status?.purgeable} />
              </div>

              <div className="bg-card border border-border rounded-lg shadow-card p-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status?.enabled ? 'success' : 'neutral'}>
                        {status?.enabled ? 'Cycle activé' : 'Cycle désactivé'}
                      </Badge>
                      <span className="text-sm font-body text-muted-foreground">
                        Préavis : {status?.warning_days ?? '—'} j · Purge après :{' '}
                        {status?.purge_after_days ?? '—'} j
                      </span>
                    </div>
                    {status?.last_report?.ran_at && (
                      <p className="text-xs font-caption text-muted-foreground mt-2">
                        Dernier rapport : {formatDateTime(status.last_report.ran_at)}
                        {status.last_report.dry_run ? ' (simulation)' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      iconName="FlaskConical"
                      iconPosition="left"
                      loading={runRetention.isPending}
                      onClick={() => runCycle(true)}
                    >
                      Simuler (dry run)
                    </Button>
                    <Button
                      variant="danger"
                      iconName="Play"
                      iconPosition="left"
                      loading={runRetention.isPending}
                      onClick={() => runCycle(false)}
                    >
                      Exécuter
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Rapports */}
          <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Icon name="History" size={16} className="text-muted-foreground" />
              <h2 className="font-heading font-semibold text-foreground">Rapports</h2>
            </div>
            {reports.length === 0 ? (
              <EmptyState
                icon="FileText"
                title="Aucun rapport"
                description="Lancez une simulation ou un cycle pour générer un rapport."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left font-heading font-medium text-foreground">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Préavis</th>
                      <th className="py-3 px-4">Archivés</th>
                      <th className="py-3 px-4">Purgés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.report_id} className="border-b border-border last:border-b-0">
                        <td className="py-3 px-4 font-body text-sm text-foreground whitespace-nowrap">
                          {report.ran_at ? formatDateTime(report.ran_at) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={report.dry_run ? 'outline' : 'warning'}>
                            {report.dry_run ? 'Simulation' : 'Réel'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {report.warnings_sent ?? 0}
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {report.archived ?? 0}
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {report.purged ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Retention;
