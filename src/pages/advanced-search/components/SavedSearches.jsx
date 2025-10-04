import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SavedSearches = ({ onLoadSearch, onDeleteSearch }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [enableNotifications, setEnableNotifications] = useState(false);

  // Mock saved searches data
  const savedSearches = [
    {
      id: 1,
      name: "Thèses IA 2024",
      criteria: {
        keywords: "intelligence artificielle",
        documentType: "theses",
        departments: ["informatique"],
        dateRange: { uploadFrom: "2024-01-01", uploadTo: "2024-12-31" }
      },
      createdDate: "2024-09-01",
      lastUsed: "2024-09-25",
      resultCount: 15,
      hasNotifications: true
    },
    {
      id: 2,
      name: "Documents administratifs récents",
      criteria: {
        documentType: "administrative",
        dateRange: { uploadFrom: "2024-09-01", uploadTo: "" }
      },
      createdDate: "2024-09-10",
      lastUsed: "2024-09-28",
      resultCount: 42,
      hasNotifications: false
    },
    {
      id: 3,
      name: "Recherches Prof. Martin",
      criteria: {
        author: "Martin",
        documentType: "research",
        departments: ["physique", "chimie"]
      },
      createdDate: "2024-08-15",
      lastUsed: "2024-09-20",
      resultCount: 8,
      hasNotifications: true
    },
    {
      id: 4,
      name: "Cours mathématiques",
      criteria: {
        keywords: "mathématiques",
        documentType: "course_notes",
        departments: ["mathematiques"]
      },
      createdDate: "2024-08-01",
      lastUsed: "2024-09-15",
      resultCount: 23,
      hasNotifications: false
    }
  ];

  const handleLoadSearch = (search) => {
    onLoadSearch && onLoadSearch(search?.criteria);
  };

  const handleDeleteSearch = (searchId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette recherche sauvegardée ?')) {
      onDeleteSearch && onDeleteSearch(searchId);
    }
  };

  const handleSaveSearch = (e) => {
    e?.preventDefault();
    if (searchName?.trim()) {
      // Logic to save search would go here
      console.log('Saving search:', { name: searchName, notifications: enableNotifications });
      setShowSaveDialog(false);
      setSearchName('');
      setEnableNotifications(false);
    }
  };

  const formatCriteria = (criteria) => {
    const parts = [];
    if (criteria?.keywords) parts?.push(`"${criteria?.keywords}"`);
    if (criteria?.documentType) parts?.push(`Type: ${criteria?.documentType}`);
    if (criteria?.departments?.length) parts?.push(`Dép: ${criteria?.departments?.join(', ')}`);
    if (criteria?.author) parts?.push(`Auteur: ${criteria?.author}`);
    return parts?.join(' • ');
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div 
        className="p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon name="Bookmark" size={20} className="text-primary" />
            <div>
              <h3 className="font-heading font-medium text-foreground">Recherches sauvegardées</h3>
              <p className="text-sm text-muted-foreground font-body">
                {savedSearches?.length} recherche{savedSearches?.length > 1 ? 's' : ''} sauvegardée{savedSearches?.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              iconName="Plus"
              iconPosition="left"
              iconSize={16}
              onClick={(e) => {
                e?.stopPropagation();
                setShowSaveDialog(true);
              }}
              className="font-body"
            >
              Sauvegarder
            </Button>
            <Icon 
              name={isExpanded ? "ChevronUp" : "ChevronDown"} 
              size={20} 
              className="text-muted-foreground" 
            />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4">
          {savedSearches?.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="Bookmark" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h4 className="font-heading font-medium text-foreground mb-2">
                Aucune recherche sauvegardée
              </h4>
              <p className="text-muted-foreground font-body mb-4">
                Sauvegardez vos recherches fréquentes pour y accéder rapidement
              </p>
              <Button
                variant="outline"
                iconName="Plus"
                iconPosition="left"
                iconSize={16}
                onClick={() => setShowSaveDialog(true)}
                className="font-body"
              >
                Sauvegarder une recherche
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches?.map((search) => (
                <div
                  key={search?.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-body font-medium text-foreground truncate">
                          {search?.name}
                        </h4>
                        {search?.hasNotifications && (
                          <Icon name="Bell" size={14} className="text-accent" title="Notifications activées" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-body line-clamp-2 mb-2">
                        {formatCriteria(search?.criteria)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground font-caption">
                        <span>{search?.resultCount} résultat{search?.resultCount > 1 ? 's' : ''}</span>
                        <span>Créée le {new Date(search.createdDate)?.toLocaleDateString('fr-FR')}</span>
                        <span>Utilisée le {new Date(search.lastUsed)?.toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Play"
                        onClick={() => handleLoadSearch(search)}
                        title="Exécuter la recherche"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Edit"
                        title="Modifier"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Trash2"
                        onClick={() => handleDeleteSearch(search?.id)}
                        className="text-error hover:text-error"
                        title="Supprimer"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-md mx-4">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-heading font-semibold text-foreground">
                  Sauvegarder la recherche
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  iconName="X"
                  onClick={() => setShowSaveDialog(false)}
                />
              </div>
            </div>

            <form onSubmit={handleSaveSearch} className="p-6 space-y-4">
              <Input
                label="Nom de la recherche"
                type="text"
                placeholder="Entrez un nom descriptif..."
                value={searchName}
                onChange={(e) => setSearchName(e?.target?.value)}
                required
                description="Choisissez un nom qui vous aidera à identifier cette recherche"
              />

              <Checkbox
                label="Activer les notifications"
                checked={enableNotifications}
                onChange={(e) => setEnableNotifications(e?.target?.checked)}
                description="Recevoir une notification quand de nouveaux documents correspondent à cette recherche"
              />

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="font-body"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  iconName="Save"
                  iconPosition="left"
                  iconSize={16}
                  className="font-body"
                >
                  Sauvegarder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearches;