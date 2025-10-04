import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import UserActions from './components/UserActions';
import UserModal from './components/UserModal';
import ActivityPanel from './components/ActivityPanel';
import Button from '../../components/ui/Button';


const UserManagement = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
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

  // Mock user data
  const mockUsers = [
    {
      id: 'USR001',
      name: 'Marie Dubois',
      email: 'marie.dubois@universite.fr',
      role: 'admin',
      department: 'administration',
      status: 'active',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'USR002',
      name: 'Pierre Martin',
      email: 'pierre.martin@universite.fr',
      role: 'teacher',
      department: 'informatique',
      status: 'active',
      lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
      id: 'USR003',
      name: 'Sophie Laurent',
      email: 'sophie.laurent@universite.fr',
      role: 'teacher',
      department: 'mathematiques',
      status: 'active',
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'USR004',
      name: 'Jean Dupont',
      email: 'jean.dupont@universite.fr',
      role: 'student',
      department: 'informatique',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'USR005',
      name: 'Emma Moreau',
      email: 'emma.moreau@universite.fr',
      role: 'student',
      department: 'physique',
      status: 'active',
      lastLogin: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: 'USR006',
      name: 'Lucas Bernard',
      email: 'lucas.bernard@universite.fr',
      role: 'teacher',
      department: 'chimie',
      status: 'suspended',
      lastLogin: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'USR007',
      name: 'Camille Petit',
      email: 'camille.petit@universite.fr',
      role: 'student',
      department: 'biologie',
      status: 'pending',
      lastLogin: null
    },
    {
      id: 'USR008',
      name: 'Thomas Roux',
      email: 'thomas.roux@universite.fr',
      role: 'admin',
      department: 'administration',
      status: 'active',
      lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000)
    }
  ];

  // Mock activity data
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
      action: 's\'est connecté',
      type: 'login',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      ip: '192.168.1.23'
    },
    {
      id: 3,
      user: 'Thomas Roux',
      action: 'a modifié le rôle d\'un utilisateur',
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

  // Mock security alerts
  const mockSecurityAlerts = [
    {
      id: 1,
      title: 'Tentatives de connexion multiples échouées',
      description: 'Utilisateur jean.dupont@universite.fr - 5 tentatives en 10 minutes',
      severity: 'high',
      timestamp: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: 2,
      title: 'Connexion depuis une nouvelle localisation',
      description: 'Marie Dubois connectée depuis Paris (inhabituel)',
      severity: 'medium',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: 3,
      title: 'Compte inactif depuis longtemps',
      description: 'Lucas Bernard n\'a pas accédé au système depuis 14 jours',
      severity: 'low',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
    }
  ];

  // Mock current user
  const currentUser = {
    name: 'Administrateur Système',
    role: 'admin',
    email: 'admin@universite.fr'
  };

  // Initialize users
  useEffect(() => {
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

  // Filter and sort users
  useEffect(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered?.filter(user =>
        user?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        user?.email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        user?.id?.toLowerCase()?.includes(searchQuery?.toLowerCase())
      );
    }

    // Apply role filter
    if (selectedRole) {
      filtered = filtered?.filter(user => user?.role === selectedRole);
    }

    // Apply department filter
    if (selectedDepartment) {
      filtered = filtered?.filter(user => user?.department === selectedDepartment);
    }

    // Apply status filter
    if (selectedStatus) {
      filtered = filtered?.filter(user => user?.status === selectedStatus);
    }

    // Apply sorting
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

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchQuery, selectedRole, selectedDepartment, selectedStatus, sortBy, sortOrder]);

  // Calculate user counts
  const userCounts = {
    total: users?.length,
    active: users?.filter(u => u?.status === 'active')?.length,
    inactive: users?.filter(u => u?.status === 'inactive')?.length,
    suspended: users?.filter(u => u?.status === 'suspended')?.length,
    pending: users?.filter(u => u?.status === 'pending')?.length
  };

  // Event handlers
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev?.includes(userId)
        ? prev?.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers?.length === filteredUsers?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers?.map(user => user?.id));
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
    if (modalMode === 'add') {
      const newUser = {
        id: `USR${String(users?.length + 1)?.padStart(3, '0')}`,
        ...userData,
        lastLogin: null
      };
      setUsers(prev => [...prev, newUser]);
    } else {
      setUsers(prev =>
        prev?.map(user =>
          user?.id === selectedUser?.id
            ? { ...user, ...userData }
            : user
        )
      );
    }
    setSelectedUsers([]);
  };

  const handleResetPassword = (user) => {
    console.log('Reset password for:', user?.name);
    // Implementation would go here
  };

  const handleToggleStatus = (user) => {
    const newStatus = user?.status === 'active' ? 'inactive' : 'active';
    setUsers(prev =>
      prev?.map(u =>
        u?.id === user?.id
          ? { ...u, status: newStatus }
          : u
      )
    );
  };

  const handleBulkAction = (action, count) => {
    console.log(`Bulk action: ${action} for ${count} users`);
    // Implementation would go here
  };

  const handleImportUsers = () => {
    console.log('Import users from CSV');
    // Implementation would go here
  };

  const handleExportUsers = () => {
    console.log('Export users to CSV');
    // Implementation would go here
  };

  const handleLogout = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={currentUser} onLogout={handleLogout} />
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
                  securityAlerts={mockSecurityAlerts}
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