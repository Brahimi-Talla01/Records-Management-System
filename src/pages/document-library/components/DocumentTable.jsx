import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const DocumentTable = ({ 
  documents = [], 
  selectedDocuments = [], 
  onDocumentSelect = () => {},
  onDocumentAction = () => {},
  sortBy = 'name',
  sortOrder = 'asc',
  onSort = () => {},
  viewMode = 'table'
}) => {
  const [hoveredDocument, setHoveredDocument] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getFileTypeIcon = (type) => {
    const typeMap = {
      'pdf': 'FileText',
      'doc': 'FileText',
      'docx': 'FileText',
      'xls': 'Sheet',
      'xlsx': 'Sheet',
      'ppt': 'Presentation',
      'pptx': 'Presentation',
      'jpg': 'Image',
      'jpeg': 'Image',
      'png': 'Image',
      'gif': 'Image'
    };
    return typeMap?.[type?.toLowerCase()] || 'File';
  };

  const getConfidentialityColor = (level) => {
    const colorMap = {
      'public': 'text-success',
      'internal': 'text-warning',
      'confidential': 'text-error',
      'restricted': 'text-destructive'
    };
    return colorMap?.[level] || 'text-muted-foreground';
  };

  const handleSort = (column) => {
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newOrder);
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return 'ArrowUpDown';
    return sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const isSelected = (documentId) => selectedDocuments?.includes(documentId);

  const handleSelectAll = (checked) => {
    if (checked) {
      onDocumentSelect(documents?.map(doc => doc?.id));
    } else {
      onDocumentSelect([]);
    }
  };

  const handleDocumentSelect = (documentId, checked) => {
    if (checked) {
      onDocumentSelect([...selectedDocuments, documentId]);
    } else {
      onDocumentSelect(selectedDocuments?.filter(id => id !== documentId));
    }
  };

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents?.map((document) => (
          <div
            key={document?.id}
            className="bg-card border border-border rounded-lg p-4 hover:shadow-card transition-shadow duration-200"
            onMouseEnter={() => setHoveredDocument(document?.id)}
            onMouseLeave={() => setHoveredDocument(null)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={isSelected(document?.id)}
                  onChange={(e) => handleDocumentSelect(document?.id, e?.target?.checked)}
                  size="sm"
                />
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                  <Icon 
                    name={getFileTypeIcon(document?.type)} 
                    size={16} 
                    className="text-muted-foreground" 
                  />
                </div>
              </div>
              {hoveredDocument === document?.id && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDocumentAction('preview', document)}
                    title="Aperçu"
                  >
                    <Icon name="Eye" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDocumentAction('download', document)}
                    title="Télécharger"
                  >
                    <Icon name="Download" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDocumentAction('share', document)}
                    title="Partager"
                  >
                    <Icon name="Share2" size={14} />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-body font-medium text-sm text-foreground truncate" title={document?.name}>
                {document?.name}
              </h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-caption">{document?.type?.toUpperCase()}</span>
                <span className="font-caption">{formatFileSize(document?.size)}</span>
              </div>
              <div className="text-xs text-muted-foreground font-caption">
                {document?.department}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-caption">
                  {formatDate(document?.uploadDate)}
                </span>
                <span className={`text-xs font-caption ${getConfidentialityColor(document?.confidentiality)}`}>
                  {document?.confidentiality}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 p-3">
                <Checkbox
                  checked={selectedDocuments?.length === documents?.length && documents?.length > 0}
                  indeterminate={selectedDocuments?.length > 0 && selectedDocuments?.length < documents?.length}
                  onChange={(e) => handleSelectAll(e?.target?.checked)}
                  size="sm"
                />
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Nom du fichier
                  <Icon name={getSortIcon('name')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('type')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Type
                  <Icon name={getSortIcon('type')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('category')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Catégorie
                  <Icon name={getSortIcon('category')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('department')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Département
                  <Icon name={getSortIcon('department')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('size')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Taille
                  <Icon name={getSortIcon('size')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('uploadDate')}
                  className="font-heading font-medium text-sm -ml-2"
                >
                  Date d'ajout
                  <Icon name={getSortIcon('uploadDate')} size={14} className="ml-1" />
                </Button>
              </th>
              <th className="text-left p-3 font-heading font-medium text-sm text-foreground">
                Confidentialité
              </th>
              <th className="text-center p-3 font-heading font-medium text-sm text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {documents?.map((document, index) => (
              <tr
                key={document?.id}
                className={`border-b border-border hover:bg-muted/50 transition-colors duration-200 ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                }`}
                onMouseEnter={() => setHoveredDocument(document?.id)}
                onMouseLeave={() => setHoveredDocument(null)}
              >
                <td className="p-3">
                  <Checkbox
                    checked={isSelected(document?.id)}
                    onChange={(e) => handleDocumentSelect(document?.id, e?.target?.checked)}
                    size="sm"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <Icon 
                        name={getFileTypeIcon(document?.type)} 
                        size={16} 
                        className="text-muted-foreground" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-foreground truncate" title={document?.name}>
                        {document?.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="font-caption text-sm text-muted-foreground uppercase">
                    {document?.type}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-body text-sm text-foreground">
                    {document?.category}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-body text-sm text-foreground">
                    {document?.department}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-caption text-sm text-muted-foreground">
                    {formatFileSize(document?.size)}
                  </span>
                </td>
                <td className="p-3">
                  <span className="font-caption text-sm text-muted-foreground">
                    {formatDate(document?.uploadDate)}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`font-caption text-sm ${getConfidentialityColor(document?.confidentiality)}`}>
                    {document?.confidentiality}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDocumentAction('preview', document)}
                      title="Aperçu"
                    >
                      <Icon name="Eye" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDocumentAction('download', document)}
                      title="Télécharger"
                    >
                      <Icon name="Download" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDocumentAction('share', document)}
                      title="Partager"
                    >
                      <Icon name="Share2" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDocumentAction('edit', document)}
                      title="Modifier"
                    >
                      <Icon name="Edit" size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {documents?.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading font-medium text-lg text-foreground mb-2">
            Aucun document trouvé
          </h3>
          <p className="font-body text-muted-foreground">
            Aucun document ne correspond aux critères de recherche actuels.
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentTable;