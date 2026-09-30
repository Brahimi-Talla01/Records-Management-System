import { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const RecentDocuments = ({ userRole, documents = [] }) => {
  const [viewMode, setViewMode] = useState('grid');

  const mockDocuments = [
    {
      id: 1,
      name: 'Rapport_Annuel_2024.pdf',
      type: 'pdf',
      size: '2.4 MB',
      lastModified: new Date(Date.now() - 300000),
      author: 'Marie Dubois',
      department: 'Administration',
      status: 'approved',
      thumbnail: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=300&fit=crop',
      tags: ['rapport', 'annuel', '2024']
    },
    {
      id: 2,
      name: 'Thèse_Intelligence_Artificielle.pdf',
      type: 'pdf',
      size: '15.7 MB',
      lastModified: new Date(Date.now() - 900000),
      author: 'Jean Martin',
      department: 'Informatique',
      status: 'pending',
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop',
      tags: ['thèse', 'ia', 'recherche']
    },
    {
      id: 3,
      name: 'Cours_Mathématiques_L1.docx',
      type: 'docx',
      size: '890 KB',
      lastModified: new Date(Date.now() - 1800000),
      author: 'Sophie Laurent',
      department: 'Mathématiques',
      status: 'approved',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop',
      tags: ['cours', 'mathématiques', 'l1']
    },
    {
      id: 4,
      name: 'Budget_Département_2024.xlsx',
      type: 'xlsx',
      size: '456 KB',
      lastModified: new Date(Date.now() - 3600000),
      author: 'Pierre Durand',
      department: 'Finance',
      status: 'draft',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
      tags: ['budget', 'finance', '2024']
    },
    {
      id: 5,
      name: 'Règlement_Intérieur.pdf',
      type: 'pdf',
      size: '1.2 MB',
      lastModified: new Date(Date.now() - 7200000),
      author: 'Admin Système',
      department: 'Administration',
      status: 'approved',
      thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=300&fit=crop',
      tags: ['règlement', 'officiel']
    },
    {
      id: 6,
      name: 'Présentation_Rentrée_2024.pptx',
      type: 'pptx',
      size: '3.8 MB',
      lastModified: new Date(Date.now() - 10800000),
      author: 'Direction',
      department: 'Administration',
      status: 'approved',
      thumbnail: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
      tags: ['présentation', 'rentrée']
    }
  ];

  const displayDocuments = documents?.length > 0 ? documents : mockDocuments;

  const getFileIcon = (type) => {
    const icons = {
      pdf: 'FileText',
      docx: 'FileText',
      xlsx: 'FileSpreadsheet',
      pptx: 'Presentation',
      jpg: 'Image',
      png: 'Image',
      zip: 'Archive'
    };
    return icons?.[type] || 'File';
  };

  const getFileColor = (type) => {
    const colors = {
      pdf: 'text-red-600',
      docx: 'text-blue-600',
      xlsx: 'text-green-600',
      pptx: 'text-orange-600',
      jpg: 'text-purple-600',
      png: 'text-purple-600',
      zip: 'text-gray-600'
    };
    return colors?.[type] || 'text-gray-600';
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: { label: 'Approuvé', className: 'bg-green-100 text-green-800' },
      pending: { label: 'En attente', className: 'bg-orange-100 text-orange-800' },
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-800' }
    };
    return badges?.[status] || badges?.draft;
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return timestamp?.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDocumentAction = (action, documentId) => {
    console.log(`Action ${action} on document ${documentId}`);
    // Handle document actions
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center">
              <Icon name="FileText" size={18} color="white" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Documents Récents</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                iconName="List"
                onClick={() => setViewMode('list')}
                className="rounded-r-none border-r border-border"
                title="Vue liste"
              />
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                iconName="Grid3X3"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
                title="Vue grille"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              iconName="ExternalLink"
              iconPosition="right"
              iconSize={14}
              onClick={() => window.location.href = '/document-library'}
              className="text-muted-foreground hover:text-foreground font-body"
            >
              Voir tout
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {displayDocuments?.slice(0, 6)?.map((document) => (
              <div key={document?.id} className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg transition-colors duration-200">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Icon 
                      name={getFileIcon(document?.type)} 
                      size={20} 
                      className={getFileColor(document?.type)}
                    />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-body font-medium text-foreground truncate">
                      {document?.name}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-caption ${getStatusBadge(document?.status)?.className}`}>
                      {getStatusBadge(document?.status)?.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground font-caption">
                    <span>{document?.size}</span>
                    <span>•</span>
                    <span>{document?.author}</span>
                    <span>•</span>
                    <span>{document?.department}</span>
                    <span>•</span>
                    <span>{formatTimestamp(document?.lastModified)}</span>
                  </div>
                  
                  {document?.tags && (
                    <div className="flex items-center space-x-1 mt-2">
                      {document?.tags?.slice(0, 3)?.map((tag, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-caption">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Eye"
                    onClick={() => handleDocumentAction('view', document?.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Voir"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Download"
                    onClick={() => handleDocumentAction('download', document?.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Télécharger"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="MoreVertical"
                    onClick={() => handleDocumentAction('more', document?.id)}
                    className="text-muted-foreground hover:text-foreground"
                    title="Plus d'actions"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayDocuments?.slice(0, 6)?.map((document) => (
              <div key={document?.id} className="bg-muted rounded-lg p-4 hover:shadow-md transition-all duration-200">
                <div className="aspect-video bg-background rounded-lg mb-3 overflow-hidden">
                  <Image
                    src={document?.thumbnail}
                    alt={document?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={getFileIcon(document?.type)} 
                        size={16} 
                        className={getFileColor(document?.type)}
                      />
                      <span className="text-xs text-muted-foreground font-caption uppercase">
                        {document?.type}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-caption ${getStatusBadge(document?.status)?.className}`}>
                      {getStatusBadge(document?.status)?.label}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-body font-medium text-foreground line-clamp-2">
                    {document?.name}
                  </h4>
                  
                  <div className="text-xs text-muted-foreground font-caption space-y-1">
                    <div>{document?.size} • {document?.author}</div>
                    <div>{formatTimestamp(document?.lastModified)}</div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        onClick={() => handleDocumentAction('view', document?.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Voir"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Download"
                        onClick={() => handleDocumentAction('download', document?.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Télécharger"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="MoreVertical"
                      onClick={() => handleDocumentAction('more', document?.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Plus d'actions"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {displayDocuments?.length === 0 && (
          <div className="text-center py-8">
            <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-medium text-foreground mb-2">
              Aucun document récent
            </h3>
            <p className="text-muted-foreground font-body mb-4">
              Commencez par télécharger votre premier document
            </p>
            <Button
              variant="default"
              iconName="Upload"
              iconPosition="left"
              iconSize={16}
              onClick={() => window.location.href = '/document-upload'}
              className="font-body"
            >
              Télécharger un document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentDocuments;