import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FolderNavigation = ({
  currentPath = [],
  onNavigate = () => {},
  folders = []
}) => {
  const handleFolderClick = (folderPath) => {
    onNavigate(folderPath);
  };

  const handleBreadcrumbClick = (index) => {
    const newPath = currentPath?.slice(0, index + 1);
    onNavigate(newPath);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 mb-4">
        <Icon name="Folder" size={16} className="text-muted-foreground" />
        <nav className="flex items-center space-x-1" aria-label="Navigation des dossiers">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate([])}
            className="font-body text-muted-foreground hover:text-foreground"
          >
            Racine
          </Button>
          
          {currentPath?.map((folder, index) => (
            <React.Fragment key={index}>
              <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className={`font-body ${
                  index === currentPath?.length - 1 
                    ? 'text-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {folder?.name}
              </Button>
            </React.Fragment>
          ))}
        </nav>
      </div>
      {/* Folder Grid */}
      {folders?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {folders?.map((folder) => (
            <button
              key={folder?.id}
              onClick={() => handleFolderClick([...currentPath, folder])}
              className="flex flex-col items-center p-3 rounded-lg hover:bg-muted transition-colors duration-200 group"
            >
              <div className="w-12 h-12 flex items-center justify-center mb-2">
                <Icon 
                  name={folder?.hasSubfolders ? "FolderOpen" : "Folder"} 
                  size={32} 
                  className="text-accent group-hover:text-primary transition-colors duration-200" 
                />
              </div>
              <span className="font-body text-xs text-center text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                {folder?.name}
              </span>
              {folder?.documentCount > 0 && (
                <span className="font-caption text-xs text-muted-foreground mt-1">
                  {folder?.documentCount} doc{folder?.documentCount > 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {/* Empty State */}
      {folders?.length === 0 && currentPath?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="FolderOpen" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading font-medium text-lg text-foreground mb-2">
            Organisation par dossiers
          </h3>
          <p className="font-body text-muted-foreground">
            Les documents sont organisés par départements et catégories pour faciliter la navigation.
          </p>
        </div>
      )}
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => {
              if (currentPath?.length > 0) {
                const newPath = currentPath?.slice(0, -1);
                onNavigate(newPath);
              }
            }}
            disabled={currentPath?.length === 0}
            className="font-body"
          >
            Retour
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            iconName="Home"
            iconPosition="left"
            onClick={() => onNavigate([])}
            disabled={currentPath?.length === 0}
            className="font-body"
          >
            Racine
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="FolderPlus"
            iconPosition="left"
            className="font-body"
          >
            Nouveau dossier
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            iconName="Upload"
            iconPosition="left"
            onClick={() => window.location.href = '/document-upload'}
            className="font-body"
          >
            Télécharger ici
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FolderNavigation;