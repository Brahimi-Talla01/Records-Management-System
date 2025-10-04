import React from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const UserFilters = ({
  searchQuery = '',
  onSearchChange = () => {},
  selectedRole = '',
  onRoleChange = () => {},
  selectedDepartment = '',
  onDepartmentChange = () => {},
  selectedStatus = '',
  onStatusChange = () => {},
  onClearFilters = () => {},
  userCounts = {}
}) => {
  const roleOptions = [
    { value: '', label: 'Tous les rôles' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'teacher', label: 'Enseignant' },
    { value: 'student', label: 'Étudiant' }
  ];

  const departmentOptions = [
    { value: '', label: 'Tous les départements' },
    { value: 'informatique', label: 'Informatique' },
    { value: 'mathematiques', label: 'Mathématiques' },
    { value: 'physique', label: 'Physique' },
    { value: 'chimie', label: 'Chimie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'litterature', label: 'Littérature' },
    { value: 'histoire', label: 'Histoire' },
    { value: 'economie', label: 'Économie' },
    { value: 'droit', label: 'Droit' },
    { value: 'medecine', label: 'Médecine' },
    { value: 'administration', label: 'Administration' }
  ];

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'pending', label: 'En attente' }
  ];

  const hasActiveFilters = selectedRole || selectedDepartment || selectedStatus || searchQuery;

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Rechercher par nom, email ou ID utilisateur..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e?.target?.value)}
            className="pl-10"
          />
          <Icon 
            name="Search" 
            size={16} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
          />
        </div>
      </div>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Select
          label="Rôle"
          options={roleOptions}
          value={selectedRole}
          onChange={onRoleChange}
          placeholder="Sélectionner un rôle"
        />

        <Select
          label="Département"
          options={departmentOptions}
          value={selectedDepartment}
          onChange={onDepartmentChange}
          placeholder="Sélectionner un département"
          searchable
        />

        <Select
          label="Statut"
          options={statusOptions}
          value={selectedStatus}
          onChange={onStatusChange}
          placeholder="Sélectionner un statut"
        />

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            iconName="X"
            iconPosition="left"
            iconSize={16}
            className="font-body w-full"
          >
            Effacer les filtres
          </Button>
        </div>
      </div>
      {/* User Count Summary */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Users" size={16} className="text-muted-foreground" />
          <span className="text-sm font-body text-muted-foreground">
            Total: <span className="font-medium text-foreground">{userCounts?.total || 0}</span>
          </span>
        </div>

        {userCounts?.active > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm font-body text-muted-foreground">
              Actifs: <span className="font-medium text-foreground">{userCounts?.active}</span>
            </span>
          </div>
        )}

        {userCounts?.inactive > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-sm font-body text-muted-foreground">
              Inactifs: <span className="font-medium text-foreground">{userCounts?.inactive}</span>
            </span>
          </div>
        )}

        {userCounts?.suspended > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-error rounded-full"></div>
            <span className="text-sm font-body text-muted-foreground">
              Suspendus: <span className="font-medium text-foreground">{userCounts?.suspended}</span>
            </span>
          </div>
        )}

        {userCounts?.pending > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <span className="text-sm font-body text-muted-foreground">
              En attente: <span className="font-medium text-foreground">{userCounts?.pending}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFilters;