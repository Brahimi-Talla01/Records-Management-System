import React, { useState } from 'react';
import Button from '../../../components/ui/Button';

import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SearchFilters = ({ 
  activeFilters = {}, 
  onFilterChange, 
  resultCount = 0,
  onClearFilters 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter options
  const fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'Word' },
    { value: 'xls', label: 'Excel' },
    { value: 'ppt', label: 'PowerPoint' },
    { value: 'txt', label: 'Texte' },
    { value: 'img', label: 'Images' }
  ];

  const fileSizes = [
    { value: 'small', label: 'Petit (&lt; 1 MB)' },
    { value: 'medium', label: 'Moyen (1-10 MB)' },
    { value: 'large', label: 'Grand (10-100 MB)' },
    { value: 'xlarge', label: 'Très grand (&gt; 100 MB)' }
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'Anglais' },
    { value: 'es', label: 'Espagnol' },
    { value: 'de', label: 'Allemand' },
    { value: 'it', label: 'Italien' }
  ];

  const accessLevels = [
    { value: 'full', label: 'Accès complet' },
    { value: 'view', label: 'Lecture seule' },
    { value: 'restricted', label: 'Accès restreint' }
  ];

  // Mock filter counts
  const filterCounts = {
    fileTypes: { pdf: 45, doc: 23, xls: 12, ppt: 8, txt: 15, img: 6 },
    fileSizes: { small: 32, medium: 41, large: 18, xlarge: 4 },
    languages: { fr: 78, en: 15, es: 3, de: 2, it: 1 },
    accessLevels: { full: 67, view: 25, restricted: 8 }
  };

  const handleFilterChange = (filterType, value, checked) => {
    const currentValues = activeFilters?.[filterType] || [];
    let newValues;

    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues?.filter(v => v !== value);
    }

    onFilterChange && onFilterChange(filterType, newValues);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters)?.reduce((count, filterArray) => {
      return count + (Array.isArray(filterArray) ? filterArray?.length : 0);
    }, 0);
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div 
        className="p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon name="Filter" size={20} className="text-primary" />
            <div>
              <h3 className="font-heading font-medium text-foreground">Filtres de recherche</h3>
              <p className="text-sm text-muted-foreground font-body">
                {resultCount} résultat{resultCount > 1 ? 's' : ''}
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded font-caption">
                    {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                iconPosition="left"
                iconSize={14}
                onClick={(e) => {
                  e?.stopPropagation();
                  onClearFilters && onClearFilters();
                }}
                className="font-body text-muted-foreground"
              >
                Effacer
              </Button>
            )}
            <Icon 
              name={isExpanded ? "ChevronUp" : "ChevronDown"} 
              size={20} 
              className="text-muted-foreground" 
            />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* File Types */}
          <div>
            <h4 className="font-body font-medium text-foreground mb-3 flex items-center space-x-2">
              <Icon name="FileType" size={16} />
              <span>Type de fichier</span>
            </h4>
            <div className="space-y-2">
              {fileTypes?.map((type) => (
                <div key={type?.value} className="flex items-center justify-between">
                  <Checkbox
                    label={type?.label}
                    checked={(activeFilters?.fileTypes || [])?.includes(type?.value)}
                    onChange={(e) => handleFilterChange('fileTypes', type?.value, e?.target?.checked)}
                  />
                  <span className="text-sm text-muted-foreground font-caption">
                    {filterCounts?.fileTypes?.[type?.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* File Sizes */}
          <div>
            <h4 className="font-body font-medium text-foreground mb-3 flex items-center space-x-2">
              <Icon name="HardDrive" size={16} />
              <span>Taille de fichier</span>
            </h4>
            <div className="space-y-2">
              {fileSizes?.map((size) => (
                <div key={size?.value} className="flex items-center justify-between">
                  <Checkbox
                    label={size?.label}
                    checked={(activeFilters?.fileSizes || [])?.includes(size?.value)}
                    onChange={(e) => handleFilterChange('fileSizes', size?.value, e?.target?.checked)}
                  />
                  <span className="text-sm text-muted-foreground font-caption">
                    {filterCounts?.fileSizes?.[size?.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h4 className="font-body font-medium text-foreground mb-3 flex items-center space-x-2">
              <Icon name="Languages" size={16} />
              <span>Langue</span>
            </h4>
            <div className="space-y-2">
              {languages?.map((language) => (
                <div key={language?.value} className="flex items-center justify-between">
                  <Checkbox
                    label={language?.label}
                    checked={(activeFilters?.languages || [])?.includes(language?.value)}
                    onChange={(e) => handleFilterChange('languages', language?.value, e?.target?.checked)}
                  />
                  <span className="text-sm text-muted-foreground font-caption">
                    {filterCounts?.languages?.[language?.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Access Levels */}
          <div>
            <h4 className="font-body font-medium text-foreground mb-3 flex items-center space-x-2">
              <Icon name="Shield" size={16} />
              <span>Niveau d'accès</span>
            </h4>
            <div className="space-y-2">
              {accessLevels?.map((level) => (
                <div key={level?.value} className="flex items-center justify-between">
                  <Checkbox
                    label={level?.label}
                    checked={(activeFilters?.accessLevels || [])?.includes(level?.value)}
                    onChange={(e) => handleFilterChange('accessLevels', level?.value, e?.target?.checked)}
                  />
                  <span className="text-sm text-muted-foreground font-caption">
                    {filterCounts?.accessLevels?.[level?.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-body font-medium text-foreground mb-3">Filtres rapides</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="Clock"
                iconPosition="left"
                iconSize={14}
                className="font-body"
              >
                Dernière semaine
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="TrendingUp"
                iconPosition="left"
                iconSize={14}
                className="font-body"
              >
                Plus populaires
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Star"
                iconPosition="left"
                iconSize={14}
                className="font-body"
              >
                Favoris
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="Eye"
                iconPosition="left"
                iconSize={14}
                className="font-body"
              >
                Récemment vus
              </Button>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="pt-4 border-t border-border">
            <div className="space-y-3">
              <Checkbox
                label="Inclure les documents archivés"
                checked={activeFilters?.includeArchived || false}
                onChange={(e) => onFilterChange && onFilterChange('includeArchived', e?.target?.checked)}
                description="Rechercher également dans les documents archivés"
              />
              <Checkbox
                label="Recherche dans les versions précédentes"
                checked={activeFilters?.includeVersions || false}
                onChange={(e) => onFilterChange && onFilterChange('includeVersions', e?.target?.checked)}
                description="Inclure toutes les versions des documents"
              />
              <Checkbox
                label="Recherche floue"
                checked={activeFilters?.fuzzySearch || true}
                onChange={(e) => onFilterChange && onFilterChange('fuzzySearch', e?.target?.checked)}
                description="Tolérer les fautes de frappe et variations"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;