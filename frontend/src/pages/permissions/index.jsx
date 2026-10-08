/**
 * Accords de permissions (F6.7) — par document : lecture des accords
 * (`GET /permissions/document/<id>/grants`), accord/révocation
 * utilisateur et rôle, et outil de débogage `POST /permissions/check`.
 * Les accords **dossier** (admin) réutilisent la même mécanique côté API.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Checkbox } from '../../components/ui/Checkbox';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';
import {
  useDocumentGrants,
  useGrantDocumentUser,
  useRevokeDocumentUser,
  useGrantDocumentRole,
  useRevokeDocumentRole,
  permissionsApi,
} from '../../features/permissions';
import { toAppError } from '../../lib/errors';

const ACTIONS = [
  { key: 'can_view', label: 'Voir' },
  { key: 'can_download', label: 'Télécharger' },
  { key: 'can_edit', label: 'Modifier' },
  { key: 'can_delete', label: 'Supprimer' },
];

const ACTION_KEYS = ['view', 'download', 'edit', 'delete'];

const emptyRights = () => ({ can_view: true, can_download: false, can_edit: false, can_delete: false });

const RightsBadges = ({ grant }) => (
  <div className="flex flex-wrap gap-1">
    {ACTIONS.map(({ key, label }) =>
      grant[key] ? (
        <Badge key={key} variant="primary">
          {label}
        </Badge>
      ) : null
    )}
  </div>
);

const Permissions = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  const [documentId, setDocumentId] = useState('');
  const [loadedId, setLoadedId] = useState(null);

  const [userForm, setUserForm] = useState({ userId: '', rights: emptyRights() });
  const [roleForm, setRoleForm] = useState({ roleId: '', rights: emptyRights() });
  const [checkForm, setCheckForm] = useState({ object: 'document', id: '', action: 'view', userId: '' });
  const [checkResult, setCheckResult] = useState(null);

  const grantsQuery = useDocumentGrants(loadedId);
  const grantUser = useGrantDocumentUser(loadedId);
  const revokeUser = useRevokeDocumentUser(loadedId);
  const grantRole = useGrantDocumentRole(loadedId);
  const revokeRole = useRevokeDocumentRole(loadedId);

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

  const handleError = (error) => toast.error(toAppError(error).message);

  const loadGrants = () => {
    const id = Number.parseInt(documentId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error("Identifiant de document invalide.");
      return;
    }
    setLoadedId(id);
  };

  const handleGrantUser = async () => {
    const userId = Number.parseInt(userForm.userId, 10);
    if (!Number.isFinite(userId) || userId <= 0) {
      toast.error("Identifiant d'utilisateur invalide.");
      return;
    }
    try {
      await grantUser.mutateAsync({ userId, rights: userForm.rights });
      toast.success(`Droits accordés à l'utilisateur #${userId}.`);
      setUserForm({ userId: '', rights: emptyRights() });
    } catch (error) {
      handleError(error);
    }
  };

  const handleGrantRole = async () => {
    const roleId = Number.parseInt(roleForm.roleId, 10);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      toast.error('Identifiant de rôle invalide.');
      return;
    }
    try {
      await grantRole.mutateAsync({ roleId, rights: roleForm.rights });
      toast.success(`Droits accordés au rôle #${roleId}.`);
      setRoleForm({ roleId: '', rights: emptyRights() });
    } catch (error) {
      handleError(error);
    }
  };

  const handleRevoke = async (kind, id) => {
    const ok = await confirm({
      title: 'Révoquer les droits',
      description: `Révoquer tous les droits ${kind === 'user' ? "de l'utilisateur" : 'du rôle'} #${id} sur ce document ?`,
      confirmLabel: 'Révoquer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      if (kind === 'user') await revokeUser.mutateAsync(id);
      else await revokeRole.mutateAsync(id);
      toast.success('Droits révoqués.');
    } catch (error) {
      handleError(error);
    }
  };

  const handleCheck = async () => {
    const id = Number.parseInt(checkForm.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Identifiant cible invalide.');
      return;
    }
    try {
      const result = await permissionsApi.check({
        object: checkForm.object,
        id,
        action: checkForm.action,
        ...(checkForm.userId ? { user_id: Number(checkForm.userId) } : {}),
      });
      setCheckResult(result);
    } catch (error) {
      handleError(error);
    }
  };

  const grants = grantsQuery.data;
  const userGrants = grants?.users || [];
  const roleGrants = grants?.roles || [];

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold text-foreground">Permissions</h1>
            <p className="font-body text-muted-foreground mt-2">
              Accords par document et outil de vérification des droits effectifs.
            </p>
          </div>

          {/* Sélecteur de document */}
          <div className="bg-card border border-border rounded-lg shadow-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <Input
                label="Document à administrer"
                type="number"
                value={documentId}
                onChange={(event) => setDocumentId(event.target.value)}
                placeholder="Identifiant du document"
                className="flex-1"
              />
              <Button
                variant="default"
                iconName="Search"
                iconPosition="left"
                onClick={loadGrants}
              >
                Charger les accords
              </Button>
            </div>
          </div>

          {!loadedId ? (
            <EmptyState
              icon="ShieldCheck"
              title="Aucun document chargé"
              description="Saisissez l'identifiant d'un document pour consulter et gérer ses accords."
            />
          ) : (
            <div className="space-y-6">
              {/* Utilisateurs */}
              <section className="bg-card border border-border rounded-lg shadow-card">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Icon name="User" size={16} className="text-muted-foreground" />
                  <h2 className="font-heading font-semibold text-foreground">
                    Accords utilisateurs
                  </h2>
                </div>
                <div className="p-4 border-b border-border grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <Input
                      label="Utilisateur (id)"
                      type="number"
                      value={userForm.userId}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, userId: event.target.value }))
                      }
                      className="w-40"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ACTIONS.map(({ key, label }) => (
                        <Checkbox
                          key={key}
                          label={label}
                          checked={userForm.rights[key]}
                          onChange={(event) =>
                            setUserForm((prev) => ({
                              ...prev,
                              rights: { ...prev.rights, [key]: event.target.checked },
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    iconName="ShieldCheck"
                    iconPosition="left"
                    loading={grantUser.isPending}
                    onClick={handleGrantUser}
                  >
                    Accorder
                  </Button>
                </div>
                {grantsQuery.isLoading ? (
                  <div className="p-4">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : userGrants.length === 0 ? (
                  <EmptyState
                    icon="UserX"
                    title="Aucun accord utilisateur"
                    description="Ce document n'a aucun droit explicite accordé à un utilisateur."
                  />
                ) : (
                  <ul>
                    {userGrants.map((grant) => (
                      <li
                        key={grant.user_id}
                        className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-body font-medium text-foreground">
                            Utilisateur #{grant.user_id}
                          </span>
                          <RightsBadges grant={grant} />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="ShieldOff"
                          onClick={() => handleRevoke('user', grant.user_id)}
                        >
                          Révoquer
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Rôles */}
              <section className="bg-card border border-border rounded-lg shadow-card">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Icon name="Shield" size={16} className="text-muted-foreground" />
                  <h2 className="font-heading font-semibold text-foreground">Accords par rôle</h2>
                </div>
                <div className="p-4 border-b border-border grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <Input
                      label="Rôle (id)"
                      type="number"
                      value={roleForm.roleId}
                      onChange={(event) =>
                        setRoleForm((prev) => ({ ...prev, roleId: event.target.value }))
                      }
                      className="w-40"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ACTIONS.map(({ key, label }) => (
                        <Checkbox
                          key={key}
                          label={label}
                          checked={roleForm.rights[key]}
                          onChange={(event) =>
                            setRoleForm((prev) => ({
                              ...prev,
                              rights: { ...prev.rights, [key]: event.target.checked },
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    iconName="ShieldCheck"
                    iconPosition="left"
                    loading={grantRole.isPending}
                    onClick={handleGrantRole}
                  >
                    Accorder
                  </Button>
                </div>
                {roleGrants.length === 0 ? (
                  <EmptyState
                    icon="ShieldOff"
                    title="Aucun accord par rôle"
                    description="Ce document n'a aucun droit explicite accordé à un rôle."
                  />
                ) : (
                  <ul>
                    {roleGrants.map((grant) => (
                      <li
                        key={grant.role_id}
                        className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-body font-medium text-foreground">
                            Rôle #{grant.role_id}
                          </span>
                          <RightsBadges grant={grant} />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="ShieldOff"
                          onClick={() => handleRevoke('role', grant.role_id)}
                        >
                          Révoquer
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Outil de débogage */}
              <section className="bg-card border border-border rounded-lg shadow-card p-4">
                <h2 className="font-heading font-semibold text-foreground mb-1">
                  Vérifier un droit (débogage)
                </h2>
                <p className="text-sm font-body text-muted-foreground mb-4">
                  Interroge le moteur de droits du serveur (`POST /permissions/check`).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <Select
                    label="Objet"
                    options={[
                      { value: 'document', label: 'Document' },
                      { value: 'folder', label: 'Dossier' },
                    ]}
                    value={checkForm.object}
                    onChange={(value) => setCheckForm((prev) => ({ ...prev, object: value }))}
                  />
                  <Input
                    label="Identifiant"
                    type="number"
                    value={checkForm.id}
                    onChange={(event) => setCheckForm((prev) => ({ ...prev, id: event.target.value }))}
                  />
                  <Select
                    label="Action"
                    options={ACTION_KEYS.map((action) => ({ value: action, label: action }))}
                    value={checkForm.action}
                    onChange={(value) => setCheckForm((prev) => ({ ...prev, action: value }))}
                  />
                  <Input
                    label="Pour l'utilisateur (id, optionnel)"
                    type="number"
                    value={checkForm.userId}
                    onChange={(event) =>
                      setCheckForm((prev) => ({ ...prev, userId: event.target.value }))
                    }
                  />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="outline"
                    iconName="Bug"
                    iconPosition="left"
                    onClick={handleCheck}
                  >
                    Vérifier
                  </Button>
                  {checkResult && (
                    <span className="flex items-center gap-2 font-body text-sm">
                      <Badge variant={checkResult.allowed ? 'success' : 'error'}>
                        {checkResult.allowed ? 'Autorisé' : 'Refusé'}
                      </Badge>
                      {checkResult.reason && (
                        <span className="text-muted-foreground">{checkResult.reason}</span>
                      )}
                    </span>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Permissions;
