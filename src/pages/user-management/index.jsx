/**
 * Gestion des utilisateurs (F6.5/F6.6) — écran admin branché sur le serveur.
 *
 * - pagination et filtres **serveur**, pilotés par l'URL (partageable) ;
 * - création complète (matricule, username, rôle, campus, mot de passe) ;
 * - modification, (dés)activation, soft delete, réinitialisation de mot de
 *   passe (`temporary_password` affiché) ;
 * - import CSV avec rapport d'erreurs, export CSV filtré ;
 * - actions groupées **masquées** (R6‑02 non livrée, décision Q7).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Modal from '../../components/ui/Modal';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserActions from './components/UserActions';
import UserModal from './components/UserModal';
import ActivityPanel from './components/ActivityPanel';
import {
  useUsers,
  useUserStatistics,
  useRoles,
  useDepartments,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useResetUserPassword,
  useImportUsers,
} from '../../features/users';
import { useCampusScope } from '../../features/campuses';
import {
  useAuth,
  isSuperAdmin,
  useSecurityAlerts,
  useResolveSecurityAlert,
} from '../../features/auth';
import { useDashboardActivity } from '../../features/dashboard';
import { usersApi } from '../../features/users';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { toAppError } from '../../lib/errors';
import { mapBackendRole, getAlertTypeLabel } from '../../lib/formatters';
import {
  parseUserParams,
  toUserSearchParams,
  toUsersFilters,
  countActiveFilters,
} from './urlState';

const UserManagement = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);

  // État d'URL (source unique de vérité)
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => parseUserParams(searchParams), [searchParams]);
  const patchView = (patch) => {
    setSearchParams(toUserSearchParams({ ...view, ...patch }), { replace: false });
  };

  const [searchInput, setSearchInput] = useState(view.q);
  useEffect(() => setSearchInput(view.q), [view.q]);

  // Debounce 300 ms : la frappe ne pousse l'URL qu'après une pause (A10).
  useEffect(() => {
    if (searchInput === view.q) return undefined;
    const timer = setTimeout(() => patchView({ q: searchInput || null, page: null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const filters = useMemo(() => toUsersFilters(view), [view]);

  // Données serveur
  const usersQuery = useUsers({ page: view.page, filters });
  const statisticsQuery = useUserStatistics();
  const rolesQuery = useRoles();
  const departmentsQuery = useDepartments();
  const { canSelect: canSelectCampus, campuses } = useCampusScope();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const importUsers = useImportUsers();

  const securityAlertsQuery = useSecurityAlerts();
  const resolveAlert = useResolveSecurityAlert();
  const activityQuery = useDashboardActivity();

  const { user: me, logout } = useAuth();

  // Sélection (confort local, jamais envoyée au serveur)
  const [selected, setSelected] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [importErrors, setImportErrors] = useState(null);
  const [showActivityPanel, setShowActivityPanel] = useState(false);

  const users = usersQuery.data?.users || [];
  const roles = rolesQuery.data || [];
  const departments = departmentsQuery.data || [];
  const totalPages = usersQuery.data?.pages || 1;

  const headerUser = me
    ? {
        name: me.full_name || me.username,
        role: mapBackendRole(me.role?.name),
        email: me.email,
      }
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

  const securityAlerts = (securityAlertsQuery.data?.alerts || []).map((alert) => ({
    ...alert,
    title: getAlertTypeLabel(alert.alert_type),
    description: alert.message,
    timestamp: alert.created_at,
  }));

  const handleResolveAlert = (alertId) => {
    resolveAlert.mutate(alertId, {
      onSuccess: () => toast.success('Alerte marquée comme résolue.'),
      onError: (error) => toast.error(toAppError(error).message),
    });
  };

  const handleToggle = (userId) =>
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

  const handleToggleAll = () => {
    if (selected.length === users.length) setSelected([]);
    else setSelected(users.map((user) => user.user_id));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  const handleSaveUser = async (payload) => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ userId: editingUser.user_id, payload });
        toast.success('Compte mis à jour.');
      } else {
        await createUser.mutateAsync(payload);
        toast.success('Compte créé.');
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleResetPassword = async (user) => {
    const confirmed = await confirm({
      title: 'Réinitialiser le mot de passe',
      description: `Générer un nouveau mot de passe temporaire pour ${user.full_name || user.username} ?`,
      confirmLabel: 'Réinitialiser',
    });
    if (!confirmed) return;
    try {
      const result = await resetPassword.mutateAsync({ userId: user.user_id });
      const temporary = result?.temporary_password;
      toast.success(
        temporary
          ? `Mot de passe temporaire de ${user.full_name || user.username} : ${temporary}`
          : 'Mot de passe réinitialisé.'
      );
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await updateUser.mutateAsync({
        userId: user.user_id,
        payload: { is_active: !user.is_active },
      });
      toast.success(user.is_active ? 'Compte désactivé.' : 'Compte réactivé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  // Soft delete serveur : le compte passe à `is_active: false` (jamais effacé).
  const handleDelete = async (user) => {
    const confirmed = await confirm({
      title: 'Désactiver le compte',
      description: `Le compte ${user.full_name || user.username} sera désactivé (suppression logique, réversible).`,
      confirmLabel: 'Désactiver',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteUser.mutateAsync(user.user_id);
      toast.success('Compte désactivé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleImportUsers = () => fileInputRef.current?.click();

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permet de réimporter le même fichier
    if (!file) return;
    try {
      const result = await importUsers.mutateAsync(file);
      const errors = result.errors || [];
      if (errors.length > 0) {
        setImportErrors({ success: result.success ?? 0, total: result.total ?? 0, errors });
      } else {
        toast.success(`Import terminé : ${result.success ?? 0} compte(s) créé(s).`);
      }
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleExportUsers = () => {
    window.open(usersApi.exportUrl(filters), '_blank', 'noopener');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                Gestion des utilisateurs
              </h1>
              <p className="mt-2 text-muted-foreground font-body">
                Comptes, rôles et départements du périmètre autorisé par le serveur.
              </p>
            </div>
            <Button
              variant="outline"
              iconName="PanelRight"
              onClick={() => setShowActivityPanel((prev) => !prev)}
              className="font-body"
            >
              Activité
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <UserActions
                stats={{
                  total: statisticsQuery.data?.total,
                  active: statisticsQuery.data?.active,
                  inactive: statisticsQuery.data?.inactive,
                }}
                onAddUser={() => {
                  setEditingUser(null);
                  setIsModalOpen(true);
                }}
                onImportUsers={handleImportUsers}
                onExportUsers={handleExportUsers}
                importPending={importUsers.isPending}
              />

              <UserFilters
                filters={filters}
                onChange={(patch) => patchView({ ...patch, page: null })}
                onClear={handleClearFilters}
                searchQuery={searchInput}
                onSearchChange={setSearchInput}
                roles={roles}
                departments={departments}
                hasActiveFilters={countActiveFilters(view) > 0}
              />

              <UserTable
                users={users}
                isLoading={usersQuery.isLoading}
                selected={selected}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onEdit={(user) => {
                  setEditingUser(user);
                  setIsModalOpen(true);
                }}
                onResetPassword={handleResetPassword}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />

              {users.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-body">
                    Page {usersQuery.data?.current_page || view.page} sur {totalPages} —{' '}
                    {usersQuery.data?.total ?? 0} compte(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="ArrowLeft"
                      iconPosition="left"
                      disabled={(usersQuery.data?.current_page || view.page) <= 1}
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

            {showActivityPanel && (
              <div className="lg:w-80 xl:w-96">
                <ActivityPanel
                  activities={activityQuery.data?.items || []}
                  activitiesLoading={activityQuery.isLoading}
                  securityAlerts={securityAlerts}
                  onResolveAlert={handleResolveAlert}
                  onSeeAll={() => navigate('/audit')}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSaveUser}
        user={editingUser}
        roles={roles}
        departments={departments}
        campuses={campuses}
        canSelectCampus={canSelectCampus && isSuperAdmin(me)}
        isPending={createUser.isPending || updateUser.isPending}
      />

      {/* Rapport d'import : erreurs ligne à ligne (F6.5) */}
      <Modal
        isOpen={Boolean(importErrors)}
        onClose={() => setImportErrors(null)}
        title="Rapport d'import CSV"
        footer={
          <Button variant="outline" onClick={() => setImportErrors(null)}>
            Fermer
          </Button>
        }
      >
        <p className="text-sm font-body text-foreground mb-4">
          {importErrors?.success ?? 0} compte(s) créé(s) sur {importErrors?.total ?? 0} ligne(s) —{' '}
          {importErrors?.errors?.length ?? 0} erreur(s).
        </p>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {(importErrors?.errors || []).map((item, index) => (
            <li
              key={`${item.row ?? index}`}
              className="text-sm font-body text-foreground flex items-start gap-2"
            >
              <Icon name="AlertTriangle" size={14} className="text-warning mt-0.5 shrink-0" />
              <span>
                Ligne {item.row ?? '?'} : {item.error}
              </span>
            </li>
          ))}
        </ul>
      </Modal>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
};

export default UserManagement;
