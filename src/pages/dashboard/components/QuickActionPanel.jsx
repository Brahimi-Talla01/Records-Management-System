import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuickActionsPanel = ({ userRole, onAction }) => {
  const quickActions = [
    {
      id: 'upload',
      label: 'Télécharger Document',
      icon: 'Upload',
      variant: 'default',
      description: 'Ajouter un nouveau document',
      roles: ['admin', 'teacher', 'staff']
    },
    {
      id: 'scan',
      label: 'Scanner Document',
      icon: 'Scan',
      variant: 'outline',
      description: 'Numériser un document papier',
      roles: ['admin', 'staff']
    },
    {
      id: 'search',
      label: 'Recherche Avancée',
      icon: 'Search',
      variant: 'outline',
      description: 'Rechercher dans tous les documents',
      roles: ['admin', 'teacher', 'staff', 'student']
    },
    {
      id: 'library',
      label: 'Bibliothèque',
      icon: 'FolderOpen',
      variant: 'ghost',
      description: 'Parcourir tous les documents',
      roles: ['admin', 'teacher', 'staff', 'student']
    }
  ];

  const availableActions = quickActions?.filter(action => 
    action?.roles?.includes(userRole)
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Icon name="Zap" size={18} color="white" />
        </div>
        <h2 className="text-lg font-heading font-semibold text-foreground">Actions Rapides</h2>
      </div>
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {availableActions?.map((action) => (
          <div key={action?.id} className="group overflow-hidden">
            <Button
              variant={action?.variant}
              iconName={action?.icon}
              iconPosition="left"
              iconSize={20}
              onClick={() => onAction(action?.id)}
              fullWidth
              className="h-auto p-4 justify-start font-body group-hover:shadow-md transition-all duration-200"
            >
              <div className="text-left">
                <div className="font-medium">{action?.label}</div>
                <div className="text-xs text-muted-foreground mt-1 font-caption">
                  {action?.description}
                </div>
              </div>
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <Button
          variant="ghost"
          iconName="MoreHorizontal"
          iconPosition="left"
          iconSize={16}
          onClick={() => onAction('more')}
          fullWidth
          className="text-muted-foreground hover:text-foreground font-body"
        >
          Plus d'actions
        </Button>
      </div>
    </div>
  );
};

export default QuickActionsPanel;