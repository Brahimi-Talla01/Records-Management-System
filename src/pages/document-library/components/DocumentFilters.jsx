import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const DocumentFilters = ({
  filters = {},
  onFiltersChange = () => {},
  onClearFilters = () => {},
  resultsCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const documentTypes = [
    { value: 'all', label: 'Tous les types' },
    { value: 'student-files', label: 'Dossiers étudiants' },
    { value: 'theses', label: 'Thèses' },
    { value: 'administrative', label: 'Documents administratifs' },
    { value: 'course-notes', label: 'Notes de cours' },
    { value: 'research', label: 'Documents de recherche' }
  ];

  const departments = [
    { value: 'all', label: 'Tous les départements' },
    { value: 'informatique', label: 'Informatique' },
    { value: 'mathematiques', label: 'Mathématiques' },
    { value: 'physique', label: 'Physique' },
    { value: 'chimie', label: 'Chimie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'lettres', label: 'Lettres' },
    { value: 'histoire', label: 'Histoire' },
    { value: 'economie', label: 'Économie' },
    { value: 'droit', label: 'Droit' },
    { value: 'administration', label: 'Administration' }
  ];

  const confidentialityLevels = [
    { value: 'all', label: 'Tous les niveaux' },
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Interne' },
    { value: 'confidential', label: 'Confidentiel' },
    { value: 'restricted', label: 'Restreint' }
  ];

  const fileFormats = [
    { value: 'all', label: 'Tous les formats' },
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'Word (DOC/DOCX)' },
    { value: 'xls', label: 'Excel (XLS/XLSX)' },
    { value: 'ppt', label: 'PowerPoint (PPT/PPTX)' },
    { value: 'image', label: 'Images (JPG/PNG/GIF)' }
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters)?.some(value => 
      value && value !== 'all' && value !== ''
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      {/* Quick Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 flex-1">
          <Select
            options={documentTypes}
            value={filters?.type || 'all'}
            onChange={(value) => handleFilterChange('type', value)}
            placeholder="Type de document"
            className="w-full sm:w-48"
          />
          
          <Select
            options={departments}
            value={filters?.department || 'all'}
            onChange={(value) => handleFilterChange('department', value)}
            placeholder="Département"
            className="w-full sm:w-48"
          />
          
          <Select
            options={confidentialityLevels}
            value={filters?.confidentiality || 'all'}
            onChange={(value) => handleFilterChange('confidentiality', value)}
            placeholder="Confidentialité"
            className="w-full sm:w-44"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-body"
          >
            Filtres avancés
          </Button>
          
          {hasActiveFilters() && (
            <Button
              variant="ghost"
              iconName="X"
              iconPosition="left"
              onClick={onClearFilters}
              className="font-body text-muted-foreground"
            >
              Effacer
            </Button>
          )}
        </div>
      </div>
      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Format de fichier"
              options={fileFormats}
              value={filters?.format || 'all'}
              onChange={(value) => handleFilterChange('format', value)}
            />
            
            <Input
              label="Date de début"
              type="date"
              value={filters?.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e?.target?.value)}
            />
            
            <Input
              label="Date de fin"
              type="date"
              value={filters?.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e?.target?.value)}
            />
            
            <Input
              label="Taille min (MB)"
              type="number"
              placeholder="0"
              value={filters?.minSize || ''}
              onChange={(e) => handleFilterChange('minSize', e?.target?.value)}
            />
            
            <Input
              label="Taille max (MB)"
              type="number"
              placeholder="100"
              value={filters?.maxSize || ''}
              onChange={(e) => handleFilterChange('maxSize', e?.target?.value)}
            />
            
            <Input
              label="Auteur"
              type="text"
              placeholder="Nom de l'auteur"
              value={filters?.author || ''}
              onChange={(e) => handleFilterChange('author', e?.target?.value)}
            />
            
            <Input
              label="Mots-clés"
              type="text"
              placeholder="Tags séparés par des virgules"
              value={filters?.tags || ''}
              onChange={(e) => handleFilterChange('tags', e?.target?.value)}
            />
            
            <div className="flex items-end">
              <Button
                variant="outline"
                iconName="Search"
                iconPosition="left"
                onClick={() => window.location.href = '/advanced-search'}
                className="font-body w-full"
              >
                Recherche avancée
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Results Count */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="FileText" size={16} className="text-muted-foreground" />
          <span className="font-body text-sm text-muted-foreground">
            {resultsCount} document{resultsCount !== 1 ? 's' : ''} trouvé{resultsCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        {hasActiveFilters() && (
          <div className="flex items-center space-x-2">
            <Icon name="Filter" size={16} className="text-accent" />
            <span className="font-caption text-sm text-accent">
              Filtres actifs
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentFilters;