import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DocumentPreviewModal = ({
  document = null,
  isOpen = false,
  onClose = () => {},
  onDownload = () => {},
  onShare = () => {},
  onEdit = () => {}
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !document) return null;

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const canPreview = (type) => {
    const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
    return previewableTypes?.includes(type?.toLowerCase());
  };

  const renderPreview = () => {
    const type = document?.type?.toLowerCase();
    
    if (type === 'pdf') {
      return (
        <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-muted-foreground">
              Aperçu PDF disponible dans la version complète
            </p>
          </div>
        </div>
      );
    }
    
    if (['jpg', 'jpeg', 'png', 'gif']?.includes(type)) {
      return (
        <div className="w-full h-96 bg-muted rounded-lg overflow-hidden">
          <img
            src={document?.previewUrl || `https://picsum.photos/800/600?random=${document?.id}`}
            alt={document?.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="w-full h-full hidden items-center justify-center">
            <div className="text-center">
              <Icon name="Image" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="font-body text-muted-foreground">
                Impossible de charger l'aperçu de l'image
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Icon name={getFileTypeIcon(document?.type)} size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            Aperçu non disponible pour ce type de fichier
          </p>
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={() => onDownload(document)}
            className="mt-4 font-body"
          >
            Télécharger pour voir
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 bg-opacity-50"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-modal max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Icon 
                name={getFileTypeIcon(document?.type)} 
                size={20} 
                className="text-muted-foreground" 
              />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-lg text-foreground">
                {document?.name}
              </h2>
              <p className="font-body text-sm text-muted-foreground">
                {document?.category} • {document?.department}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
              onClick={() => onDownload(document)}
              className="font-body"
            >
              Télécharger
            </Button>
            <Button
              variant="outline"
              iconName="Share2"
              iconPosition="left"
              onClick={() => onShare(document)}
              className="font-body"
            >
              Partager
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Preview Area */}
          <div className="flex-1 p-6">
            {renderPreview()}
          </div>
          
          {/* Metadata Sidebar */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-muted/20">
            <div className="p-6 space-y-6 overflow-y-auto max-h-full">
              <div>
                <h3 className="font-heading font-medium text-sm text-foreground mb-3">
                  Informations du fichier
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-muted-foreground">Type</span>
                    <span className="font-caption text-sm text-foreground uppercase">
                      {document?.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-muted-foreground">Taille</span>
                    <span className="font-caption text-sm text-foreground">
                      {formatFileSize(document?.size)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-muted-foreground">Ajouté le</span>
                    <span className="font-caption text-sm text-foreground">
                      {formatDate(document?.uploadDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-muted-foreground">Modifié le</span>
                    <span className="font-caption text-sm text-foreground">
                      {formatDate(document?.modifiedDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-muted-foreground">Confidentialité</span>
                    <span className={`font-caption text-sm ${getConfidentialityColor(document?.confidentiality)}`}>
                      {document?.confidentiality}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-heading font-medium text-sm text-foreground mb-3">
                  Métadonnées
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-body text-sm text-muted-foreground block">Auteur</span>
                    <span className="font-body text-sm text-foreground">
                      {document?.author || 'Non spécifié'}
                    </span>
                  </div>
                  <div>
                    <span className="font-body text-sm text-muted-foreground block">Description</span>
                    <span className="font-body text-sm text-foreground">
                      {document?.description || 'Aucune description disponible'}
                    </span>
                  </div>
                  {document?.tags && document?.tags?.length > 0 && (
                    <div>
                      <span className="font-body text-sm text-muted-foreground block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {document?.tags?.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-accent/10 text-accent rounded text-xs font-caption"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="font-heading font-medium text-sm text-foreground mb-3">
                  Permissions
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Icon name="Eye" size={14} className="text-muted-foreground" />
                    <span className="font-body text-sm text-foreground">Lecture autorisée</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon name="Download" size={14} className="text-muted-foreground" />
                    <span className="font-body text-sm text-foreground">Téléchargement autorisé</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Icon name="Share2" size={14} className="text-muted-foreground" />
                    <span className="font-body text-sm text-foreground">Partage autorisé</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  iconName="Edit"
                  iconPosition="left"
                  onClick={() => onEdit(document)}
                  fullWidth
                  className="font-body"
                >
                  Modifier les métadonnées
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;