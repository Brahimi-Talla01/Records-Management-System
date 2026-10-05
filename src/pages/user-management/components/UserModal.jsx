import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/AppIcon';
import { passwordSchema } from '../../../lib/validate';

/**
 * Formulaire de compte (F6.5) — miroir du contrat `POST/PUT /users` :
 * `matricule`, `username`, `role_id` requis ; `password` optionnel à la
 * création (défaut serveur `ChangeMe@123`) ; `campus_id` implicite
 * (hérité du créateur) sauf pour un super admin (règle Q2 backend).
 */
const EMPTY_FORM = {
  matricule: '',
  username: '',
  full_name: '',
  email: '',
  role_id: '',
  department_id: '',
  campus_id: '',
  password: '',
  is_active: true,
};

const UserModal = ({
  isOpen = false,
  onClose = () => {},
  onSubmit,
  user = null,
  roles = [],
  departments = [],
  campuses = [],
  canSelectCampus = false,
  isPending = false,
}) => {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (isEdit) {
      setForm({
        matricule: user.matricule || '',
        username: user.username || '',
        full_name: user.full_name || '',
        email: user.email || '',
        role_id: user.role?.role_id ? String(user.role.role_id) : '',
        department_id: user.department?.department_id
          ? String(user.department.department_id)
          : '',
        campus_id: user.campus_id ? String(user.campus_id) : '',
        password: '', // jamais réécrit : la réinitialisation est dédiée
        is_active: user.is_active ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, isEdit, user]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.matricule.trim()) next.matricule = 'Le matricule est requis';
    if (!form.username.trim()) next.username = "Le nom d'utilisateur est requis";
    if (!form.role_id) next.role_id = 'Le rôle est requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Format d'email invalide";
    }
    if (!isEdit && form.password) {
      const parsed = passwordSchema.safeParse(form.password);
      if (!parsed.success) {
        next.password = parsed.error.issues[0]?.message || 'Mot de passe trop faible';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      matricule: form.matricule.trim(),
      username: form.username.trim(),
      full_name: form.full_name.trim() || null,
      email: form.email.trim() || null,
      role_id: Number(form.role_id),
      department_id: form.department_id ? Number(form.department_id) : null,
      is_active: form.is_active,
    };
    if (!isEdit) {
      if (form.password) payload.password = form.password;
      if (canSelectCampus && form.campus_id) payload.campus_id = Number(form.campus_id);
    }
    onSubmit(payload);
  };

  const roleOptions = [
    { value: '', label: 'Sélectionner un rôle…' },
    ...roles.map((role) => ({ value: String(role.role_id), label: role.name })),
  ];
  const departmentOptions = [
    { value: '', label: 'Aucun département' },
    ...departments.map((department) => ({
      value: String(department.department_id),
      label: department.name || department.code || `#${department.department_id}`,
    })),
  ];
  const campusOptions = [
    { value: '', label: 'Global (tous les campus)' },
    ...campuses.map((campus) => ({
      value: String(campus.campus_id),
      label: `${campus.name} (${campus.code})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Modifier le compte' : 'Nouveau compte utilisateur'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="default"
            iconName={isEdit ? 'Save' : 'UserPlus'}
            iconPosition="left"
            loading={isPending}
            onClick={handleSubmit}
          >
            {isEdit ? 'Enregistrer' : 'Créer le compte'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Matricule"
            value={form.matricule}
            onChange={(event) => updateField('matricule', event.target.value)}
            error={errors.matricule}
            placeholder="ETU2026-001"
            required
          />
          <Input
            label="Nom d'utilisateur"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            error={errors.username}
            placeholder="prenom.nom"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom complet"
            value={form.full_name}
            onChange={(event) => updateField('full_name', event.target.value)}
            placeholder="Prénom Nom"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            error={errors.email}
            placeholder="utilisateur@universite.cm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Rôle"
            options={roleOptions}
            value={form.role_id}
            onChange={(value) => updateField('role_id', value)}
            error={errors.role_id}
            required
          />
          <Select
            label="Département"
            options={departmentOptions}
            value={form.department_id}
            onChange={(value) => updateField('department_id', value)}
            searchable
          />
        </div>

        {/* Règle Q2 backend : campus implicite (hérité du créateur), sauf
            super admin qui choisit explicitement (ou laisse global). */}
        {canSelectCampus && !isEdit && (
          <Select
            label="Campus"
            description="Laisser vide pour un compte global. Sinon, hérité de votre campus."
            options={campusOptions}
            value={form.campus_id}
            onChange={(value) => updateField('campus_id', value)}
          />
        )}

        {!isEdit && (
          <Input
            label="Mot de passe initial"
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            error={errors.password}
            description="Optionnel — sinon le serveur pose un mot de passe temporaire à communiquer au compte."
            autoComplete="new-password"
          />
        )}

        <Checkbox
          label="Compte actif"
          checked={form.is_active}
          onChange={(event) => updateField('is_active', event.target.checked)}
        />

        <p className="flex items-center gap-2 text-xs font-caption text-muted-foreground">
          <Icon name="Info" size={14} />
          {isEdit
            ? 'La désactivation via la corbeille équivaut à un désabonnement : le compte est conservé.'
            : 'Le matricule, le nom d’utilisateur et le rôle sont transmis tels quels au serveur.'}
        </p>
      </form>
    </Modal>
  );
};

export default UserModal;
