import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/**
 * Actions de l'écran utilisateurs (F6.5).
 * Les actions groupées sont **masquées** tant que `POST /api/users/bulk`
 * n'existe pas côté backend (décision Q7, ligne R6‑02, P7).
 */
const UserActions = ({ stats = {}, onAddUser, onImportUsers, onExportUsers, importPending }) => (
  <div className="bg-card border border-border rounded-lg p-4 shadow-card">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Button
          variant="default"
          iconName="UserPlus"
          iconPosition="left"
          iconSize={16}
          onClick={onAddUser}
          className="font-body"
        >
          Ajouter un utilisateur
        </Button>

        <Button
          variant="outline"
          iconName="Upload"
          iconPosition="left"
          iconSize={16}
          onClick={onImportUsers}
          loading={importPending}
          className="font-body"
        >
          Importer CSV
        </Button>

        <Button
          variant="outline"
          iconName="Download"
          iconPosition="left"
          iconSize={16}
          onClick={onExportUsers}
          className="font-body"
        >
          Exporter
        </Button>
      </div>

      {/* Statistiques réelles (GET /users/statistics) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5 mb-1">
            <Icon name="Users" size={16} className="text-muted-foreground" />
            <span className="text-xs font-caption text-muted-foreground">Total</span>
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">
            {stats.total ?? '—'}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5 mb-1">
            <Icon name="UserCheck" size={16} className="text-muted-foreground" />
            <span className="text-xs font-caption text-muted-foreground">Actifs</span>
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">
            {stats.active ?? '—'}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1.5 mb-1">
            <Icon name="UserX" size={16} className="text-muted-foreground" />
            <span className="text-xs font-caption text-muted-foreground">Inactifs</span>
          </div>
          <p className="text-lg font-heading font-semibold text-foreground">
            {stats.inactive ?? '—'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default UserActions;
