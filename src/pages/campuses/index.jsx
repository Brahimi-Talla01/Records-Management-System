/**
 * Administration des campus (F6.1–F6.2, super admin).
 *
 * Création, édition, bascule d'activation et suppression **refusée** par le
 * serveur (`409` : pas de suppression physique, Q4). Le sélecteur de campus
 * (A4) vit ici ; les autres écrans admin l'affichent via `CampusScopeBar`.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import Modal from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Checkbox } from '../../components/ui/Checkbox';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';
import {
  useCampuses,
  useCreateCampus,
  useUpdateCampus,
  useSetCampusStatus,
  campusesApi,
} from '../../features/campuses';
import { toAppError } from '../../lib/errors';

const EMPTY_FORM = {
  code: '',
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  is_active: true,
};

const Campuses = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  const campusesQuery = useCampuses();
  const createCampus = useCreateCampus();
  const updateCampus = useUpdateCampus();
  const setStatus = useSetCampusStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

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

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsOpen(true);
  };

  const openEdit = (campus) => {
    setEditing(campus);
    setForm({
      code: campus.code,
      name: campus.name,
      address: campus.address || '',
      city: campus.city || '',
      phone: campus.phone || '',
      email: campus.email || '',
      is_active: campus.is_active,
    });
    setIsOpen(true);
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Le code et le nom du campus sont requis.');
      return;
    }
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address || null,
      city: form.city || null,
      phone: form.phone || null,
      email: form.email || null,
    };
    try {
      if (editing) {
        await updateCampus.mutateAsync({ campusId: editing.campus_id, payload });
        toast.success('Campus mis à jour.');
      } else {
        await createCampus.mutateAsync({ ...payload, is_active: form.is_active });
        toast.success('Campus créé.');
      }
      setIsOpen(false);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleToggleStatus = async (campus) => {
    const next = !campus.is_active;
    const ok = await confirm({
      title: next ? 'Activer le campus' : 'Désactiver le campus',
      description: next
        ? `Le campus « ${campus.name} » redeviendra disponible.`
        : `Le campus « ${campus.name} » sera désactivé. La désactivation est refusée si des données y sont rattachées.`,
      confirmLabel: next ? 'Activer' : 'Désactiver',
      variant: next ? 'default' : 'warning',
    });
    if (!ok) return;
    try {
      await setStatus.mutateAsync({ campusId: campus.campus_id, isActive: next });
      toast.success(next ? 'Campus activé.' : 'Campus désactivé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleDeleteAttempt = async (campus) => {
    const ok = await confirm({
      title: 'Supprimer le campus',
      description:
        'La suppression physique est interdite par le serveur (ressources rattachées). Désactivez le campus à la place.',
      confirmLabel: 'Continuer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await campusesApi.remove(campus.campus_id);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const campuses = campusesQuery.data || [];

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Campus</h1>
              <p className="font-body text-muted-foreground mt-2">
                Gérez les établissements (multi-campus) et leur périmètre.
              </p>
            </div>
            <Button variant="default" iconName="Plus" iconPosition="left" onClick={openCreate}>
              Nouveau campus
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
            {campusesQuery.isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : campuses.length === 0 ? (
              <EmptyState
                icon="Building2"
                title="Aucun campus"
                description="Créez le premier campus pour organiser les ressources."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left font-heading font-medium text-foreground">
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4">Ville</th>
                      <th className="py-3 px-4">Ressources</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campuses.map((campus) => (
                      <tr key={campus.campus_id} className="border-b border-border last:border-b-0">
                        <td className="py-4 px-4">
                          <p className="font-body font-medium text-foreground">{campus.name}</p>
                          <p className="font-caption text-xs text-muted-foreground">{campus.code}</p>
                        </td>
                        <td className="py-4 px-4 font-body text-sm text-foreground">
                          {campus.city || '—'}
                        </td>
                        <td className="py-4 px-4 font-caption text-xs text-muted-foreground">
                          {campus.stats
                            ? `${campus.stats.departments} dép. · ${campus.stats.users} comptes · ${campus.stats.documents} docs`
                            : '—'}
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={campus.is_active ? 'success' : 'neutral'}>
                            {campus.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Edit"
                              title="Modifier"
                              onClick={() => openEdit(campus)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName={campus.is_active ? 'Ban' : 'CheckCircle'}
                              title={campus.is_active ? 'Désactiver' : 'Activer'}
                              onClick={() => handleToggleStatus(campus)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Trash2"
                              title="Supprimer (interdit)"
                              onClick={() => handleDeleteAttempt(campus)}
                            />
                          </div>
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

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? 'Modifier le campus' : 'Nouveau campus'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="default"
              iconName="Save"
              iconPosition="left"
              loading={createCampus.isPending || updateCampus.isPending}
              onClick={handleSubmit}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Code"
              value={form.code}
              onChange={(event) => updateField('code', event.target.value)}
              placeholder="CAMPUS-NORD"
              required
            />
            <Input
              label="Nom"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Campus Nord"
              required
            />
            <Input
              label="Ville"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
            />
            <Input
              label="Téléphone"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
            />
            <Input
              label="Adresse"
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </div>
          {!editing && (
            <Checkbox
              label="Campus actif"
              checked={form.is_active}
              onChange={(event) => updateField('is_active', event.target.checked)}
            />
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Campuses;
