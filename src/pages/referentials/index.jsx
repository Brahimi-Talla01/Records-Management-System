/**
 * Référentiels en écriture (F6.4) — départements, types de documents,
 * étiquettes et rôles. Les `409` serveur (code déjà pris, référentiel utilisé
 * par des documents/comptes) sont traduits par la couche d'erreurs.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Icon from '../../components/AppIcon';
import CampusScopeBar from '../../components/ui/CampusScopeBar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';
import {
  useCampusScope,
} from '../../features/campuses';
import {
  useDepartments,
  useDocTypes,
  useTags,
  useRoles,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateDocType,
  useUpdateDocType,
  useDeleteDocType,
  useCreateTag,
  useDeleteTag,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '../../features/referentials';
import { toAppError } from '../../lib/errors';

const TABS = [
  { id: 'departments', label: 'Départements', icon: 'Building' },
  { id: 'doc-types', label: 'Types de documents', icon: 'FileText' },
  { id: 'tags', label: 'Étiquettes', icon: 'Tag' },
  { id: 'roles', label: 'Rôles', icon: 'Shield' },
];

const EMPTY_FORM = { name: '', code: '', description: '', retention: '', campus_id: '' };

const Referentials = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();
  const { canSelect: canSelectCampus, campusId, setCampusId, campuses, scopeName } =
    useCampusScope();

  const [activeTab, setActiveTab] = useState('departments');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // entité en cours d'édition
  const [form, setForm] = useState(EMPTY_FORM);

  const departmentsQuery = useDepartments({ campusId });
  const docTypesQuery = useDocTypes();
  const tagsQuery = useTags();
  const rolesQuery = useRoles();

  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const createDocType = useCreateDocType();
  const updateDocType = useUpdateDocType();
  const deleteDocType = useDeleteDocType();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

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

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (entity) => {
    setEditing(entity);
    setForm({
      name: entity.name || '',
      code: entity.code || '',
      description: entity.description || '',
      retention: entity.default_retention_days ? String(entity.default_retention_days) : '',
      campus_id: entity.campus_id ? String(entity.campus_id) : '',
    });
    setModalOpen(true);
  };

  const handleError = (error) => toast.error(toAppError(error).message);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    try {
      if (activeTab === 'departments') {
        if (!form.code.trim()) {
          toast.error('Le code est requis.');
          return;
        }
        const payload = {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          description: form.description || null,
        };
        if (!editing && canSelectCampus && form.campus_id) {
          payload.campus_id = Number(form.campus_id);
        }
        if (editing) {
          await updateDepartment.mutateAsync({ id: editing.department_id, payload });
        } else {
          await createDepartment.mutateAsync(payload);
        }
      } else if (activeTab === 'doc-types') {
        const payload = {
          name: form.name.trim(),
          description: form.description || null,
          ...(form.retention ? { default_retention_days: Number(form.retention) } : {}),
        };
        if (editing) {
          await updateDocType.mutateAsync({ id: editing.doc_type_id, payload });
        } else {
          await createDocType.mutateAsync(payload);
        }
      } else if (activeTab === 'roles') {
        const payload = { name: form.name.trim(), description: form.description || null };
        if (editing) {
          await updateRole.mutateAsync({ id: editing.role_id, payload });
        } else {
          await createRole.mutateAsync(payload);
        }
      }
      toast.success(editing ? 'Référentiel mis à jour.' : 'Référentiel créé.');
      setModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleAddTag = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom du tag est requis.');
      return;
    }
    try {
      await createTag.mutateAsync({ name: form.name.trim() });
      setForm(EMPTY_FORM);
      toast.success('Étiquette créée.');
    } catch (error) {
      handleError(error);
    }
  };

  const handleDelete = async (kind, id, label) => {
    const ok = await confirm({
      title: 'Supprimer',
      description: `Supprimer « ${label} » ? Le serveur refuse l'opération s'il est encore utilisé.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      if (kind === 'departments') await deleteDepartment.mutateAsync(id);
      else if (kind === 'doc-types') await deleteDocType.mutateAsync(id);
      else if (kind === 'tags') await deleteTag.mutateAsync(id);
      else await deleteRole.mutateAsync(id);
      toast.success('Supprimé.');
    } catch (error) {
      handleError(error);
    }
  };

  const isLoading =
    departmentsQuery.isLoading || docTypesQuery.isLoading || tagsQuery.isLoading || rolesQuery.isLoading;
  const isPending =
    createDepartment.isPending || updateDepartment.isPending || createDocType.isPending ||
    updateDocType.isPending || createRole.isPending || updateRole.isPending || createTag.isPending;

  const rows =
    activeTab === 'departments'
      ? (departmentsQuery.data || []).map((item) => ({
          id: item.department_id,
          primary: item.name,
          secondary: item.code,
          description: item.description,
          extra: item.campus_id ? `Campus #${item.campus_id}` : 'Global',
        }))
      : activeTab === 'doc-types'
        ? (docTypesQuery.data || []).map((item) => ({
            id: item.doc_type_id,
            primary: item.name,
            secondary: item.default_retention_days
              ? `Rétention : ${item.default_retention_days} j`
              : null,
            description: item.description,
          }))
        : activeTab === 'tags'
          ? (tagsQuery.data || []).map((item) => ({
              id: item.tag_id,
              primary: item.name,
              editable: false,
            }))
          : (rolesQuery.data || []).map((item) => ({
              id: item.role_id,
              primary: item.name,
              description: item.description,
              editable: true,
            }));

  const modalTitle =
    activeTab === 'departments'
      ? editing
        ? 'Modifier le département'
        : 'Nouveau département'
      : activeTab === 'doc-types'
        ? editing
          ? 'Modifier le type'
          : 'Nouveau type de document'
        : editing
          ? 'Modifier le rôle'
          : 'Nouveau rôle';

  const renderTagForm = () => (
    <div className="bg-card border border-border rounded-lg shadow-card p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <Input
          label="Nouvelle étiquette"
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="IA, recherche…"
          className="flex-1"
        />
        <Button
          variant="default"
          iconName="Plus"
          iconPosition="left"
          loading={createTag.isPending}
          onClick={handleAddTag}
        >
          Ajouter
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Référentiels</h1>
              <p className="font-body text-muted-foreground mt-2">
                Départements, types de documents, étiquettes et rôles.
              </p>
            </div>
            {activeTab !== 'tags' && (
              <Button variant="default" iconName="Plus" iconPosition="left" onClick={openCreate}>
                Ajouter
              </Button>
            )}
          </div>

          <CampusScopeBar
            campuses={campuses}
            campusId={campusId}
            onCampusChange={setCampusId}
            canSelect={canSelectCampus}
            scopeName={scopeName}
          />

          <div className="mb-6 border-b border-border">
            <nav className="flex flex-wrap gap-x-8 gap-y-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-body font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'tags' && renderTagForm()}

          <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon="Library"
                title="Aucun élément"
                description="Créez le premier élément de ce référentiel."
              />
            ) : (
              <ul>
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-body font-medium text-foreground truncate">
                          {row.primary}
                        </p>
                        {row.secondary && (
                          <Badge variant="outline">{row.secondary}</Badge>
                        )}
                      </div>
                      {row.description && (
                        <p className="text-sm font-body text-muted-foreground truncate">
                          {row.description}
                        </p>
                      )}
                      {row.extra && (
                        <p className="text-xs font-caption text-muted-foreground">{row.extra}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {row.editable !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Edit"
                          title="Modifier"
                          onClick={() =>
                            openEdit(
                              activeTab === 'departments'
                                ? (departmentsQuery.data || []).find(
                                    (d) => d.department_id === row.id
                                  )
                                : activeTab === 'doc-types'
                                  ? (docTypesQuery.data || []).find((d) => d.doc_type_id === row.id)
                                  : (rolesQuery.data || []).find((r) => r.role_id === row.id)
                            )
                          }
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Trash2"
                        title="Supprimer (refusé si utilisé)"
                        onClick={() => handleDelete(activeTab, row.id, row.primary)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="default"
              iconName="Save"
              iconPosition="left"
              loading={isPending}
              onClick={handleSubmit}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
          {activeTab === 'departments' && (
            <>
              <Input
                label="Code"
                value={form.code}
                onChange={(event) => updateField('code', event.target.value)}
                description="Unique par campus (ex. INFO)."
                required={!editing}
                disabled={Boolean(editing)} // le code identifie le département
              />
              {canSelectCampus && !editing && (
                <Select
                  label="Campus"
                  description="Laisser vide pour rattacher à votre campus."
                  options={[
                    { value: '', label: 'Mon campus' },
                    ...campuses.map((campus) => ({
                      value: String(campus.campus_id),
                      label: `${campus.name} (${campus.code})`,
                    })),
                  ]}
                  value={form.campus_id}
                  onChange={(value) => updateField('campus_id', value)}
                />
              )}
            </>
          )}
          {activeTab === 'doc-types' && (
            <Input
              label="Rétention par défaut (jours)"
              type="number"
              value={form.retention}
              onChange={(event) => updateField('retention', event.target.value)}
              description="Facultatif : préavis puis archivage automatiques."
            />
          )}
          {activeTab !== 'tags' && (
            <Input
              label="Description"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Referentials;
