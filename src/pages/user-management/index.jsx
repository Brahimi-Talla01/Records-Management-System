import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserActions from './components/UserActions';
import UserModal from './components/UserModal';
import ActivityPanel from './components/ActivityPanel';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useRoles,
  useDepartments,
} from '../../features/users';
import {
  useAuth,
  useSecurityAlerts,
  useResolveSecurityAlert,
} from '../../features/auth';
import { API_BASE_URL } from '../../lib/api';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { toAppError } from '../../lib/errors';
import { mapBackendRole, getAlertTypeLabel } from '../../lib/formatters';

const UserManagement = () => {
  // Données serveur (TanStack Query)
  const [page] = useState(1);
  const perPage = 100; // pagination côté serveur ; le client filtre localement
  const usersQuery = useUsers({ page, perPage });
  const rolesQuery = useRoles();
  const departmentsQuery = useDepartments();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const securityAlertsQuery = useSecurityAlerts();
  const resolveAlert = useResolveSecurityAlert();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  // Utilisateur connecté (session)
  const { user: me } = useAuth();

  // State management
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActivityPanel, setShowActivityPanel] = useState(false);

  // Synchronise la liste depuis le serveur
  useEffect(() => {
    if (usersQuery.data?.users) {
      setUsers(
        usersQuery.data.users.map((u) => ({
          id: u.user_id,
          matricule: u.matricule,
          name: u.full_name || u.username,
          email: u.email,
          role: mapBackendRole(u.role?.name),
          department: u.department?.code?.toLowerCase() || '',
          status: u.is_active ? 'active' : 'inactive',
          lastLogin: u.last_login ? new Date(u.last_login) : null,
          _raw: u,
        }))
      );
    }
  }, [usersQuery.data]);

  // Mock activity data (à brancher sur AuditLog en phase 2)
  const mockActivities = [
    {
      id: 1,
      user: 'Marie Dubois',
      action: 'a créé un nouvel utilisateur',
      details: 'Compte étudiant pour Emma Moreau',
      type: 'create',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      ip: '192.168.1.45'
    },
    {
      id: 2,
      user: 'Pierre Martin',
      action: "s'est connecté",
      type: 'login',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      ip: '192.168.1.23'
    },
    {
      id: 3,
      user: 'Thomas Roux',
      action: "a modifié le rôle d'un utilisateur",
      details: 'Lucas Bernard: Enseignant → Administrateur',
      type: 'role_change',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      ip: '192.168.1.67'
    },
    {
      id: 4,
      user: 'Sophie Laurent',
      action: 'a réinitialisé un mot de passe',
      details: 'Mot de passe réinitialisé pour Jean Dupont',
      type: 'password_reset',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      ip: '192.168.1.89'
    }
  ];

  // Alertes de sécurité réelles du compte connecté (GET /auth/security-alerts),
  // remappées sur la forme attendue par ActivityPanel.
  const securityAlerts = (securityAlertsQuery.data || []).map((alert) => ({
    id: alert.alert_id,
    title: getAlertTypeLabel(alert.alert_type),
    description: alert.message,
    severity: alert.severity,
    timestamp: alert.created_at,
  }));

  const handleResolveAlert = (alertId) => {
    resolveAlert.mutate(alertId, {
      onSuccess: () => toast.success('Alerte marquée comme résolue.'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  // Utilisateur connecté pour le Header (session réelle)
  const headerUser = me
    ? {
        name: me.full_name || me.username,
        role: mapBackendRole(me.role?.name),
        email: me.email,
      }
    : null;

  // Filtrage + tri locaux (sur la page courante)
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u?.name?.toLowerCase()?.includes(q) ||
          u?.email?.toLowerCase()?.includes(q) ||
          u?.matricule?.toLowerCase()?.includes(q)
      );
    }
    if (selectedRole) filtered = filtered.filter((u) => u?.role === selectedRole);
    if (selectedDepartment) filtered = filtered.filter((u) => u?.department === selectedDepartment);
    if (selectedStatus) filtered = filtered.filter((u) => u?.status === selectedStatus);

    filtered?.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (sortBy === 'lastLogin') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase();
        bValue = bValue?.toLowerCase();
      }

      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });

    return filtered;
  }, [users, searchQuery, selectedRole, selectedDepartment, selectedStatus, sortBy, sortOrder]);

  const userCounts = {
    total: usersQuery.data?.total ?? users.length,
    active: users?.filter((u) => u?.status === 'active')?.length,
    inactive: users?.filter((u) => u?.status === 'inactive')?.length,
    suspended: users?.filter((u) => u?.status === 'suspended')?.length,
    pending: users?.filter((u) => u?.status === 'pending')?.length,
  };

  // Event handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev?.includes(userId) ? prev?.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers?.length === filteredUsers?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers?.map((u) => u?.id));
    }
  };

  const handleSort = (column, order) => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedRole('');
    setSelectedDepartment('');
    setSelectedStatus('');
  };

  const handleAddUser = () => {
    setModalMode('add');
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (modalMode === 'add') {
        // Le backend exige matricule + username + role_id ; mot de passe par défaut
        await createUser.mutateAsync({
          matricule: `USR${Date.now().toString().slice(-6)}`,
          username: userData.email?.split('@')[0] || userData.name.toLowerCase().replace(/\s+/g, '.'),
          email: userData.email,
          full_name: userData.name,
          role_id: rolesQuery.data?.find((r) => mapBackendRole(r.name) === userData.role)?.role_id,
          department_id: departmentsQuery.data?.find(
            (d) => d.code?.toLowerCase() === userData.department
          )?.department_id,
          is_active: userData.status !== 'inactive',
        });
      } else if (selectedUser?._raw) {
        await updateUser.mutateAsync({
          userId: selectedUser.id,
          payload: {
            email: userData.email,
            full_name: userData.name,
            role_id: rolesQuery.data?.find((r) => mapBackendRole(r.name) === userData.role)?.role_id,
            department_id: departmentsQuery.data?.find(
              (d) => d.code?.toLowerCase() === userData.department
            )?.department_id,
            is_active: userData.status !== 'inactive',
          },
        });
      }
      setIsModalOpen(false);
      setSelectedUsers([]);
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  const handleResetPassword = async (user) => {
    const confirmed = await confirm({
      title: 'Réinitialiser le mot de passe',
      description: `Réinitialiser le mot de passe de ${user?.name} ?`,
      confirmLabel: 'Réinitialiser',
    });
    if (!confirmed) return;
    try {
      const { usersApi } = await import('../../features/users/api');
      const result = await usersApi.resetPassword(user.id, 'ChangeMe@123');
      const temporary = result?.temporary_password;
      toast.success(
        temporary
          ? `Mot de passe temporaire de ${user?.name} : ${temporary}`
          : `Mot de passe réinitialisé pour ${user?.name}.`
      );
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        payload: { is_active: user.status === 'inactive' },
      });
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  };

  const handleBulkAction = (action, count) => {
    // Actions groupées : masquées tant que POST /api/users/bulk n'existe pas (R6-02, P7).
    toast.info(
      `Action groupée « ${action} » indisponible pour ${count} compte(s) : fonctionnalité à venir.`
    );
  };

  const handleImportUsers = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { usersApi } = await import('../../features/users/api');
        const result = await usersApi.importCsv(file);
        toast.success(
          `Import terminé : ${result.success} succès, ${result.errors?.length || 0} erreur(s)`
        );
      } catch (err) {
        toast.error(toAppError(err).message);
      }
    };
    input.click();
  };

  const handleExportUsers = () => {
    // Le backend renvoie un CSV en attachment (cookie de session envoyé automatiquement)
    window.open(`${API_BASE_URL}/users/export`, '_blank', 'noopener');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  if (usersQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Chargement des utilisateurs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <Breadcrumb />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mt-4">
              <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">
                  Gestion des utilisateurs
                </h1>
                <p className="mt-2 text-muted-foreground font-body">
                  Gérez les comptes utilisateurs, les rôles et les permissions de l'université
                </p>
              </div>

              <div className="mt-4 lg:mt-0 flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName={showActivityPanel ? 'PanelRightClose' : 'PanelRightOpen'}
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => setShowActivityPanel(!showActivityPanel)}
                  className="font-body"
                >
                  {showActivityPanel ? 'Masquer' : 'Activité'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className={`flex-1 space-y-6 ${showActivityPanel ? 'lg:pr-4' : ''}`}>
              {/* User Actions */}
              <UserActions
                selectedCount={selectedUsers?.length}
                onAddUser={handleAddUser}
                onBulkAction={handleBulkAction}
                onImportUsers={handleImportUsers}
                onExportUsers={handleExportUsers}
              />

              {/* User Filters */}
              <UserFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                selectedDepartment={selectedDepartment}
                onDepartmentChange={setSelectedDepartment}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                onClearFilters={handleClearFilters}
                userCounts={userCounts}
              />

              {/* User Table */}
              <UserTable
                users={filteredUsers}
                selectedUsers={selectedUsers}
                onSelectUser={handleSelectUser}
                onSelectAll={handleSelectAll}
                onEditUser={handleEditUser}
                onResetPassword={handleResetPassword}
                onToggleStatus={handleToggleStatus}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            </div>

            {/* Activity Panel */}
            {showActivityPanel && (
              <div className="lg:w-80 xl:w-96">
                <ActivityPanel
                  activities={mockActivities}
                  securityAlerts={securityAlerts}
                  onResolveAlert={handleResolveAlert}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        mode={modalMode}
      />
    </div>
  );
};

export default UserManagement;
