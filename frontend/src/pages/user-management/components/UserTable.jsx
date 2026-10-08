import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  mapBackendRole,
  getRoleLabel,
  formatRelativeTime,
} from '../../../lib/formatters';

/**
 * Tableau des comptes (F6.5) — lignes = objets API bruts (`user.to_dict()`),
 * libellés produits par `lib/formatters`, couleurs uniquement via `Badge`.
 */
const roleVariant = (role) =>
  ({
    admin: 'primary',
    teacher: 'info',
    staff: 'warning',
    student: 'neutral',
  }[mapBackendRole(role)] || 'neutral');

const UserTable = ({
  users = [],
  isLoading = false,
  selected = [],
  onToggle = () => {},
  onToggleAll = () => {},
  onEdit = () => {},
  onResetPassword = () => {},
  onToggleStatus = () => {},
  onDelete = () => {},
  emptyTitle = 'Aucun utilisateur trouvé',
  emptyDescription = 'Aucun compte ne correspond aux critères actuels.',
}) => {
  if (isLoading && users.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const isAllSelected = users.length > 0 && selected.length === users.length;
  const isIndeterminate = selected.length > 0 && selected.length < users.length;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      {/* Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead className="bg-muted border-b border-border">
            <tr>
              <th scope="col" className="w-12 p-4">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={onToggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <th scope="col" className="text-left p-4 font-heading font-medium text-foreground">Compte</th>
              <th scope="col" className="text-left p-4 font-heading font-medium text-foreground">Rôle</th>
              <th scope="col" className="text-left p-4 font-heading font-medium text-foreground">
                Département
              </th>
              <th scope="col" className="text-left p-4 font-heading font-medium text-foreground">
                Dernière connexion
              </th>
              <th scope="col" className="text-left p-4 font-heading font-medium text-foreground">Statut</th>
              <th scope="col" className="w-44 p-4 text-center font-heading font-medium text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.user_id}
                className={`border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                  selected.includes(user.user_id) ? 'bg-accent/10' : ''
                }`}
              >
                <td className="p-4">
                  <Checkbox
                    checked={selected.includes(user.user_id)}
                    onChange={() => onToggle(user.user_id)}
                    aria-label={`Sélectionner ${user.full_name || user.username}`}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shrink-0">
                      <Icon name="User" size={16} className="text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-body font-medium text-foreground truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground font-caption truncate">
                        {user.matricule ? `${user.matricule} · ` : ''}
                        {user.email || user.username}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant={roleVariant(user.role?.name)}>
                    {getRoleLabel(mapBackendRole(user.role?.name))}
                  </Badge>
                </td>
                <td className="p-4 font-body text-sm text-foreground">
                  {user.department?.name || '—'}
                </td>
                <td className="p-4 font-body text-sm text-muted-foreground">
                  {user.last_login ? formatRelativeTime(user.last_login) : 'Jamais'}
                </td>
                <td className="p-4">
                  <Badge variant={user.is_active ? 'success' : 'neutral'}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(user)}
                      title="Modifier le compte"
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
                      title={user.is_active ? 'Désactiver' : 'Réactiver'}
                      className="h-8 w-8"
                    >
                      <Icon name={user.is_active ? 'UserX' : 'UserCheck'} size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(user)}
                      title="Désactiver le compte (soft delete)"
                      className="h-8 w-8 text-muted-foreground hover:text-error"
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        {users.map((user) => (
          <div key={user.user_id} className="p-4 border-b border-border last:border-b-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center space-x-3 min-w-0">
                <Checkbox
                  checked={selected.includes(user.user_id)}
                  onChange={() => onToggle(user.user_id)}
                  aria-label={`Sélectionner ${user.full_name || user.username}`}
                />
                <div className="min-w-0">
                  <p className="font-body font-medium text-foreground truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-muted-foreground font-caption truncate">
                    {user.email || user.username}
                  </p>
                </div>
              </div>
              <Badge variant={user.is_active ? 'success' : 'neutral'}>
                {user.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <p className="text-muted-foreground font-caption">Rôle</p>
                <Badge variant={roleVariant(user.role?.name)}>
                  {getRoleLabel(mapBackendRole(user.role?.name))}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground font-caption">Département</p>
                <p className="font-body text-foreground">{user.department?.name || '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                iconName="Edit"
                iconPosition="left"
                iconSize={14}
                onClick={() => onEdit(user)}
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
                Mot de passe
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Trash2"
                iconPosition="left"
                iconSize={14}
                onClick={() => onDelete(user)}
                className="font-body"
              >
                Désactiver
              </Button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="p-12 text-center">
          <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-heading font-medium text-foreground mb-2">{emptyTitle}</h3>
          <p className="text-muted-foreground font-body">{emptyDescription}</p>
        </div>
      )}
    </div>
  );
};

export default UserTable;
