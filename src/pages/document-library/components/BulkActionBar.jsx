import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';


const BulkActionBar = ({
  selectedCount = 0,
  onBulkAction = () => {},
  onClearSelection = () => {}
}) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const bulkActions = [
    { value: '', label: 'Choisir une action...', disabled: true },
    { value: 'download', label: 'Télécharger la sélection', icon: 'Download' },
    { value: 'archive', label: 'Archiver les documents', icon: 'Archive' },
    { value: 'move', label: 'Déplacer vers un dossier', icon: 'FolderOpen' },
    { value: 'copy', label: 'Copier vers un dossier', icon: 'Copy' },
    { value: 'share', label: 'Partager la sélection', icon: 'Share2' },
    { value: 'tag', label: 'Ajouter des tags', icon: 'Tag' },
    { value: 'confidentiality', label: 'Modifier la confidentialité', icon: 'Shield' },
    { value: 'delete', label: 'Supprimer la sélection', icon: 'Trash2' }
  ];

  const handleExecuteAction = async () => {
    if (!selectedAction || selectedCount === 0) return;
    
    setIsProcessing(true);
    try {
      await onBulkAction(selectedAction, selectedCount);
      setSelectedAction('');
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionIcon = (actionValue) => {
    const action = bulkActions?.find(a => a?.value === actionValue);
    return action?.icon || 'Play';
  };

  const getActionColor = (actionValue) => {
    if (actionValue === 'delete') return 'destructive';
    if (actionValue === 'archive') return 'warning';
    return 'default';
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-card border border-border rounded-lg shadow-modal p-4 min-w-96">
        <div className="flex items-center justify-between space-x-4">
          {/* Selection Info */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-medium text-sm">
                {selectedCount}
              </span>
            </div>
            <div>
              <p className="font-body font-medium text-sm text-foreground">
                {selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
              </p>
              <p className="font-caption text-xs text-muted-foreground">
                Choisissez une action à appliquer
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Select
              options={bulkActions}
              value={selectedAction}
              onChange={setSelectedAction}
              placeholder="Action..."
              className="w-48"
            />
            
            <Button
              variant={getActionColor(selectedAction)}
              iconName={getActionIcon(selectedAction)}
              iconPosition="left"
              onClick={handleExecuteAction}
              disabled={!selectedAction || isProcessing}
              loading={isProcessing}
              className="font-body"
            >
              Exécuter
            </Button>
            
            <Button
              variant="ghost"
              iconName="X"
              onClick={onClearSelection}
              title="Annuler la sélection"
              className="text-muted-foreground"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-1">
            <span className="font-caption text-xs text-muted-foreground mr-2">Actions rapides:</span>
            
            <Button
              variant="ghost"
              size="sm"
              iconName="Download"
              onClick={() => {
                setSelectedAction('download');
                handleExecuteAction();
              }}
              disabled={isProcessing}
              className="font-body text-xs"
            >
              Télécharger
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              iconName="Share2"
              onClick={() => {
                setSelectedAction('share');
                handleExecuteAction();
              }}
              disabled={isProcessing}
              className="font-body text-xs"
            >
              Partager
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              iconName="FolderOpen"
              onClick={() => {
                setSelectedAction('move');
                handleExecuteAction();
              }}
              disabled={isProcessing}
              className="font-body text-xs"
            >
              Déplacer
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              iconName="Trash2"
              onClick={() => {
                setSelectedAction('delete');
                handleExecuteAction();
              }}
              disabled={isProcessing}
              className="font-body text-xs text-error hover:text-error"
            >
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionBar;