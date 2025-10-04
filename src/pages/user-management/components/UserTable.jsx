import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const UserTable = ({ 
  users = [], 
  selectedUsers = [], 
  onSelectUser = () => {},
  onSelectAll = () => {},
  onEditUser = () => {},
  onResetPassword = () => {},
  onToggleStatus = () => {},
  sortBy = 'name',
  sortOrder = 'asc',
  onSort = () => {}
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const handleSort = (column) => {
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newOrder);
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return 'ArrowUpDown';
    return sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-success text-success-foreground', label: 'Actif' },
      inactive: { color: 'bg-warning text-warning-foreground', label: 'Inactif' },
      suspended: { color: 'bg-error text-error-foreground', label: 'Suspendu' },
      pending: { color: 'bg-secondary text-secondary-foreground', label: 'En attente' }
    };
    
    const config = statusConfig?.[status] || statusConfig?.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-caption ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-primary text-primary-foreground', label: 'Administrateur' },
      teacher: { color: 'bg-accent text-accent-foreground', label: 'Enseignant' },
      student: { color: 'bg-muted text-muted-foreground', label: 'Étudiant' }
    };
    
    const config = roleConfig?.[role] || roleConfig?.student;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-caption ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const formatLastLogin = (date) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const loginDate = new Date(date);
    const diffInHours = Math.floor((now - loginDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'À l\'instant';
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 168) return `Il y a ${Math.floor(diffInHours / 24)}j`;
    return loginDate?.toLocaleDateString('fr-FR');
  };

  const isAllSelected = users?.length > 0 && selectedUsers?.length === users?.length;
  const isIndeterminate = selectedUsers?.length > 0 && selectedUsers?.length < users?.length;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 p-4">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onSelectAll}
                />
              </th>
              {[
                { key: 'name', label: 'Nom' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Rôle' },
                { key: 'department', label: 'Département' },
                { key: 'lastLogin', label: 'Dernière connexion' },
                { key: 'status', label: 'Statut' }
              ]?.map((column) => (
                <th key={column?.key} className="text-left p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(column?.key)}
                    className="font-heading font-medium text-muted-foreground hover:text-foreground"
                  >
                    {column?.label}
                    <Icon 
                      name={getSortIcon(column?.key)} 
                      size={14} 
                      className="ml-1" 
                    />
                  </Button>
                </th>
              ))}
              <th className="w-32 p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr
                key={user?.id}
                className={`border-b border-border hover:bg-muted/50 transition-colors duration-200 ${
                  selectedUsers?.includes(user?.id) ? 'bg-accent/10' : ''
                }`}
                onMouseEnter={() => setHoveredRow(user?.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="p-4">
                  <Checkbox
                    checked={selectedUsers?.includes(user?.id)}
                    onChange={() => onSelectUser(user?.id)}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} color="white" />
                    </div>
                    <div>
                      <p className="font-body font-medium text-foreground">{user?.name}</p>
                      <p className="text-sm text-muted-foreground font-caption">ID: {user?.id}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-body text-foreground">{user?.email}</p>
                </td>
                <td className="p-4">
                  {getRoleBadge(user?.role)}
                </td>
                <td className="p-4">
                  <p className="font-body text-foreground">{user?.department}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm font-body text-muted-foreground">
                    {formatLastLogin(user?.lastLogin)}
                  </p>
                </td>
                <td className="p-4">
                  {getStatusBadge(user?.status)}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditUser(user)}
                      title="Modifier l'utilisateur"
                      className="h-8 w-8"
                    >
                      <Icon name="Edit" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onResetPassword(user)}
                      title="Réinitialiser le mot de passe"
                      className="h-8 w-8"
                    >
                      <Icon name="Key" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(user)}
                      title={user?.status === 'active' ? 'Désactiver' : 'Activer'}
                      className="h-8 w-8"
                    >
                      <Icon 
                        name={user?.status === 'active' ? 'UserX' : 'UserCheck'} 
                        size={14} 
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="lg:hidden">
        {users?.map((user) => (
          <div
            key={user?.id}
            className={`p-4 border-b border-border last:border-b-0 ${
              selectedUsers?.includes(user?.id) ? 'bg-accent/10' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedUsers?.includes(user?.id)}
                  onChange={() => onSelectUser(user?.id)}
                />
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <Icon name="User" size={18} color="white" />
                </div>
                <div>
                  <p className="font-body font-medium text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground font-caption">{user?.email}</p>
                </div>
              </div>
              {getStatusBadge(user?.status)}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <p className="text-muted-foreground font-caption">Rôle</p>
                {getRoleBadge(user?.role)}
              </div>
              <div>
                <p className="text-muted-foreground font-caption">Département</p>
                <p className="font-body text-foreground">{user?.department}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground font-caption">Dernière connexion</p>
                <p className="font-body text-foreground">{formatLastLogin(user?.lastLogin)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                iconName="Edit"
                iconPosition="left"
                iconSize={14}
                onClick={() => onEditUser(user)}
                className="font-body"
              >
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Key"
                iconPosition="left"
                iconSize={14}
                onClick={() => onResetPassword(user)}
                className="font-body"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        ))}
      </div>
      {users?.length === 0 && (
        <div className="p-12 text-center">
          <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-medium text-foreground mb-2">
            Aucun utilisateur trouvé
          </h3>
          <p className="text-muted-foreground font-body">
            Aucun utilisateur ne correspond aux critères de recherche actuels.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserTable;