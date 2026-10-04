import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

/**
 * Filtres de la liste utilisateurs — **serveur** (F6.5) : chaque changement
 * met à jour l'URL, la requête refait la recherche. Plus aucun filtrage local
 * sur une page figée à 100 comptes.
 */
const UserFilters = ({
  filters = {},
  onChange = () => {},
  onClear = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  roles = [],
  departments = [],
  hasActiveFilters = false,
}) => {
  const roleOptions = [
    { value: '', label: 'Tous les rôles' },
    ...roles.map((role) => ({
      value: String(role.role_id),
      label: role.name,
    })),
  ];

  const departmentOptions = [
    { value: '', label: 'Tous les départements' },
    ...departments.map((department) => ({
      value: String(department.department_id),
      label: department.name || department.code || `#${department.department_id}`,
    })),
  ];

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'true', label: 'Actifs' },
    { value: 'false', label: 'Désactivés' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      {/* Recherche (debounce 300 ms géré par la page) */}
      <div className="mb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Rechercher par nom, email, matricule ou identifiant…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event?.target?.value)}
            className="pl-10"
          />
          <Icon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Rôle"
          options={roleOptions}
          value={filters.role_id || ''}
          onChange={(value) => onChange({ role_id: value || null })}
          placeholder="Tous les rôles"
        />

        <Select
          label="Département"
          options={departmentOptions}
          value={filters.department_id || ''}
          onChange={(value) => onChange({ department_id: value || null })}
          placeholder="Tous les départements"
          searchable
        />

        <Select
          label="Statut"
          options={statusOptions}
          value={filters.is_active || ''}
          onChange={(value) => onChange({ is_active: value || null })}
          placeholder="Tous les statuts"
        />

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={onClear}
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
    </div>
  );
};

export default UserFilters;
