import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const UserActions = ({
  selectedCount = 0,
  onAddUser = () => {},
  onBulkAction = () => {},
  onImportUsers = () => {},
  onExportUsers = () => {}
}) => {
  const [bulkAction, setBulkAction] = useState('');

  const bulkActionOptions = [
    { value: '', label: 'Actions groupées' },
    { value: 'activate', label: 'Activer les comptes' },
    { value: 'deactivate', label: 'Désactiver les comptes' },
    { value: 'reset-password', label: 'Réinitialiser les mots de passe' },
    { value: 'change-role', label: 'Modifier le rôle' },
    { value: 'move-department', label: 'Changer de département' },
    { value: 'send-notification', label: 'Envoyer une notification' },
    { value: 'export-selected', label: 'Exporter la sélection' },
    { value: 'delete', label: 'Supprimer les comptes' }
  ];

  const handleBulkAction = () => {
    if (bulkAction && selectedCount > 0) {
      onBulkAction(bulkAction, selectedCount);
      setBulkAction('');
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
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

        {/* Bulk Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {selectedCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-accent/10 rounded-md">
              <Icon name="CheckSquare" size={16} className="text-accent" />
              <span className="text-sm font-body text-foreground">
                {selectedCount} utilisateur{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Select
              options={bulkActionOptions}
              value={bulkAction}
              onChange={setBulkAction}
              placeholder="Actions groupées"
              disabled={selectedCount === 0}
              className="w-48"
            />
            
            <Button
              variant="outline"
              onClick={handleBulkAction}
              disabled={!bulkAction || selectedCount === 0}
              iconName="Play"
              iconPosition="left"
              iconSize={14}
              className="font-body"
            >
              Exécuter
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Icon name="UserPlus" size={16} className="text-success" />
              <span className="text-sm font-caption text-muted-foreground">Nouveaux (7j)</span>
            </div>
            <p className="text-lg font-heading font-semibold text-foreground">12</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Icon name="Activity" size={16} className="text-accent" />
              <span className="text-sm font-caption text-muted-foreground">Actifs (24h)</span>
            </div>
            <p className="text-lg font-heading font-semibold text-foreground">156</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Icon name="AlertTriangle" size={16} className="text-warning" />
              <span className="text-sm font-caption text-muted-foreground">Alertes</span>
            </div>
            <p className="text-lg font-heading font-semibold text-foreground">3</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Icon name="Clock" size={16} className="text-secondary" />
              <span className="text-sm font-caption text-muted-foreground">En attente</span>
            </div>
            <p className="text-lg font-heading font-semibold text-foreground">8</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserActions;