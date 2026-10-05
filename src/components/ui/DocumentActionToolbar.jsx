import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import Icon from '../AppIcon';
import Select from './Select';

const DocumentActionToolbar = ({ 
  onUpload = () => {},
  onSearch = () => {},
  onBulkAction = () => {},
  selectedCount = 0,
  viewMode = 'grid',
  onViewModeChange = () => {},
  sortBy = 'name',
  onSortChange = () => {},
  showBulkActions = false,
  showViewToggle = true,
  showSort = true,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortOptions = [
    { value: 'name', label: 'Nom' },
    { value: 'date', label: 'Date de modification' },
    { value: 'size', label: 'Taille' },
    { value: 'type', label: 'Type' },
  ];

  const bulkActions = [
    { value: 'download', label: 'Télécharger', icon: 'Download' },
    { value: 'archive', label: 'Archiver', icon: 'Archive' },
    { value: 'delete', label: 'Supprimer', icon: 'Trash2' },
    { value: 'move', label: 'Déplacer', icon: 'FolderOpen' },
  ];

  const handleSearch = (e) => {
    e?.preventDefault();
    onSearch(searchQuery);
    setIsSearchExpanded(false);
  };

  const handleBulkAction = (action) => {
    onBulkAction(action, selectedCount);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 shadow-card ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Left Section - Primary Actions */}
        <div className="flex items-center space-x-3">
          <Button
            variant="default"
            iconName="Upload"
            iconPosition="left"
            iconSize={16}
            onClick={onUpload}
            className="font-body"
          >
            Télécharger
          </Button>

          {/* Search */}
          <div className="relative">
            {isSearchExpanded ? (
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e?.target?.value)}
                    placeholder="Rechercher des documents..."
                    className="w-64 pl-10 pr-4 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body"
                    autoFocus
                  />
                  <Icon 
                    name="Search" 
                    size={16} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                >
                  <Icon name="Search" size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setSearchQuery('');
                  }}
                >
                  <Icon name="X" size={16} />
                </Button>
              </form>
            ) : (
              <Button
                variant="outline"
                iconName="Search"
                iconPosition="left"
                iconSize={16}
                onClick={() => setIsSearchExpanded(true)}
                className="font-body"
              >
                Rechercher
              </Button>
            )}
          </div>

          {/* Advanced Search Link */}
          <Button
            variant="ghost"
            iconName="Filter"
            iconPosition="left"
            iconSize={16}
            onClick={() => navigate('/advanced-search')}
            className="font-body text-muted-foreground"
          >
            Recherche avancée
          </Button>
        </div>

        {/* Right Section - View Controls */}
        <div className="flex items-center space-x-3">
          {/* Bulk Actions */}
          {showBulkActions && selectedCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-md">
              <span className="text-sm font-body text-muted-foreground">
                {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-1">
                {bulkActions?.map((action) => (
                  <Button
                    key={action?.value}
                    variant="ghost"
                    size="sm"
                    iconName={action?.icon}
                    onClick={() => handleBulkAction(action?.value)}
                    className="text-muted-foreground hover:text-foreground"
                    title={action?.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          {showSort && (
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={onSortChange}
              placeholder="Trier par"
              className="w-40"
            />
          )}

          {/* View Mode Toggle */}
          {showViewToggle && (
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                iconName="Grid3X3"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none border-r border-border"
                title="Vue grille"
              />
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                iconName="List"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
                title="Vue liste"
              />
            </div>
          )}

          {/* More Actions */}
          <div className="relative">
            <Button
              variant="outline"
              iconName="MoreVertical"
              size="icon"
              title="Plus d'actions"
            />
          </div>
        </div>
      </div>
      {/* Mobile Actions Row */}
      <div className="lg:hidden mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          {showSort && (
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={onSortChange}
              placeholder="Trier"
              className="flex-1 mr-3"
            />
          )}
          
          {showViewToggle && (
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                iconName="Grid3X3"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none border-r border-border"
              />
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                iconName="List"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentActionToolbar;