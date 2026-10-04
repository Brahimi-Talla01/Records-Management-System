/**
 * Journal d'audit (F6.8) — filtres pilotés par l'URL (`action`,
 * `object_type`, `user_id`, `from`, `to`, `campus_id` pour un super admin),
 * export CSV avec les mêmes filtres, pagination serveur.
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import CampusScopeBar from '../../components/ui/CampusScopeBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/useToast';
import { useAuth } from '../../features/auth';
import { mapBackendRole, formatDateTime } from '../../lib/formatters';
import { useCampusScope } from '../../features/campuses';
import { useAuditEntries, auditApi } from '../../features/audit';
import { toAppError } from '../../lib/errors';

const OBJECT_TYPES = [
  { value: '', label: 'Tous les objets' },
  { value: 'document', label: 'Document' },
  { value: 'folder', label: 'Dossier' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'role', label: 'Rôle' },
  { value: 'department', label: 'Département' },
  { value: 'campus', label: 'Campus' },
  { value: 'setting', label: 'Réglages' },
];

const Audit = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me, logout } = useAuth();
  const { canSelect: canSelectCampus, campusId, setCampusId, campuses, scopeName } =
    useCampusScope();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(
    () => ({
      action: searchParams.get('action') || '',
      object_type: searchParams.get('object_type') || '',
      user_id: searchParams.get('user_id') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      page: Number.parseInt(searchParams.get('page') ?? '1', 10) || 1,
    }),
    [searchParams]
  );

  const patchView = (patch) => {
    const next = new URLSearchParams();
    const merged = { ...view, ...patch };
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) next.set(key, String(value));
    });
    setSearchParams(next, { replace: false });
  };

  const query = useMemo(
    () => ({ ...view, campus_id: campusId ?? undefined }),
    [view, campusId]
  );
  const auditQuery = useAuditEntries(query);

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

  const handleExport = async () => {
    try {
      await auditApi.exportCsv(query);
      toast.success('Export CSV téléchargé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const items = auditQuery.data?.items || [];
  const totalPages = auditQuery.data?.pages || 1;
  const hasFilters = Object.values(view).some((value, index) => index < 5 && value);

  const renderDetails = (details) => {
    if (details === null || details === undefined) return null;
    const text = typeof details === 'string' ? details : JSON.stringify(details);
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Journal d'audit</h1>
              <p className="font-body text-muted-foreground mt-2">
                Traçabilité des actions, bornée au périmètre autorisé par le serveur.
              </p>
            </div>
            <Button variant="outline" iconName="Download" iconPosition="left" onClick={handleExport}>
              Export CSV
            </Button>
          </div>

          <CampusScopeBar
            campuses={campuses}
            campusId={campusId}
            onCampusChange={setCampusId}
            canSelect={canSelectCampus}
            scopeName={scopeName}
          />

          {/* Filtres */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                label="Action"
                value={view.action}
                onChange={(event) => patchView({ action: event.target.value, page: 1 })}
                placeholder="document_created…"
              />
              <Select
                label="Type d'objet"
                options={OBJECT_TYPES}
                value={view.object_type}
                onChange={(value) => patchView({ object_type: value, page: 1 })}
              />
              <Input
                label="Utilisateur (id)"
                type="number"
                value={view.user_id}
                onChange={(event) => patchView({ user_id: event.target.value, page: 1 })}
              />
              <Input
                label="Du"
                type="date"
                value={view.from}
                onChange={(event) => patchView({ from: event.target.value, page: 1 })}
              />
              <div className="flex items-end gap-2">
                <Input
                  label="Au"
                  type="date"
                  value={view.to}
                  onChange={(event) => patchView({ to: event.target.value, page: 1 })}
                  className="flex-1"
                />
              </div>
            </div>
            {hasFilters && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="X"
                  iconPosition="left"
                  onClick={() =>
                    patchView({ action: '', object_type: '', user_id: '', from: '', to: '', page: 1 })
                  }
                >
                  Effacer les filtres
                </Button>
              </div>
            )}
          </div>

          {/* Journal */}
          <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
            {auditQuery.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon="ScrollText"
                title="Aucune entrée"
                description="Aucune entrée du journal ne correspond aux filtres actuels."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted text-left font-heading font-medium text-foreground">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Objet</th>
                      <th className="py-3 px-4">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((entry) => (
                      <tr
                        key={entry.audit_id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-body text-sm text-muted-foreground whitespace-nowrap">
                          {entry.created_at ? formatDateTime(entry.created_at) : '—'}
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-foreground">
                          {entry.user ? entry.user.full_name || entry.user.username : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-body text-sm text-foreground flex items-center gap-2">
                            <Icon name="Activity" size={14} className="text-muted-foreground" />
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-body text-sm text-muted-foreground">
                          {entry.object_type}
                          {entry.object_id ? ` #${entry.object_id}` : ''}
                        </td>
                        <td className="py-3 px-4 font-caption text-xs text-muted-foreground max-w-xs truncate">
                          {renderDetails(entry.details) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-body">
                Page {auditQuery.data?.page || view.page} sur {totalPages} —{' '}
                {auditQuery.data?.total ?? 0} entrée(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="ArrowLeft"
                  iconPosition="left"
                  disabled={(auditQuery.data?.page || view.page) <= 1}
                  onClick={() => patchView({ page: view.page - 1 })}
                  className="font-body"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="ChevronRight"
                  iconPosition="right"
                  disabled={view.page >= totalPages}
                  onClick={() => patchView({ page: view.page + 1 })}
                  className="font-body"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Audit;
