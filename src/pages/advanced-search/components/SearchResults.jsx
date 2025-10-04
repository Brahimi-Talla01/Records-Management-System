import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const SearchResults = ({ 
  results = [], 
  totalResults = 0, 
  isLoading = false,
  onSort,
  onExport,
  onDocumentSelect,
  selectedDocuments = []
}) => {
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('table');

  const sortOptions = [
    { value: 'relevance', label: 'Pertinence' },
    { value: 'name', label: 'Nom' },
    { value: 'date_modified', label: 'Date de modification' },
    { value: 'date_uploaded', label: 'Date de téléchargement' },
    { value: 'size', label: 'Taille' },
    { value: 'type', label: 'Type' }
  ];

  const exportFormats = [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'pdf', label: 'PDF' }
  ];

  // Mock search results data
  const mockResults = [
    {
      id: 1,
      title: "Mémoire de Master - Intelligence Artificielle",
      type: "Thèse",
      department: "Informatique",
      author: "Marie Dubois",
      uploadDate: "2024-09-15",
      modifiedDate: "2024-09-20",
      size: "2.4 MB",
      confidentiality: "Public",
      relevanceScore: 95,
      snippet: "L'intelligence artificielle représente un domaine en pleine expansion qui transforme notre approche des problèmes complexes...",
      tags: ["IA", "Machine Learning", "Recherche"],
      thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=100&h=140&fit=crop",
      hasAccess: true
    },
    {
      id: 2,
      title: "Rapport de Stage - Développement Web",
      type: "Document administratif",
      department: "Informatique",
      author: "Pierre Martin",
      uploadDate: "2024-09-10",
      modifiedDate: "2024-09-18",
      size: "1.8 MB",
      confidentiality: "Interne",
      relevanceScore: 87,
      snippet: "Ce rapport présente les activités réalisées lors du stage de développement web au sein de l\'entreprise TechCorp...",
      tags: ["Stage", "Développement", "Web"],
      thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=140&fit=crop",
      hasAccess: true
    },
    {
      id: 3,
      title: "Cours de Mathématiques Appliquées",
      type: "Notes de cours",
      department: "Mathématiques",
      author: "Prof. Jean Leclerc",
      uploadDate: "2024-09-05",
      modifiedDate: "2024-09-12",
      size: "3.2 MB",
      confidentiality: "Public",
      relevanceScore: 78,
      snippet: "Les mathématiques appliquées constituent un pont essentiel entre la théorie mathématique pure et les applications pratiques...",
      tags: ["Mathématiques", "Cours", "Théorie"],
      thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&h=140&fit=crop",
      hasAccess: true
    },
    {
      id: 4,
      title: "Dossier Étudiant - Admission 2024",
      type: "Dossier étudiant",
      department: "Administration",
      author: "Service Scolarité",
      uploadDate: "2024-08-30",
      modifiedDate: "2024-09-01",
      size: "0.9 MB",
      confidentiality: "Confidentiel",
      relevanceScore: 65,
      snippet: "Dossier complet d'admission contenant les pièces justificatives, relevés de notes et lettres de recommandation...",
      tags: ["Admission", "Étudiant", "Scolarité"],
      thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=100&h=140&fit=crop",
      hasAccess: false
    },
    {
      id: 5,
      title: "Recherche en Physique Quantique",
      type: "Document de recherche",
      department: "Physique",
      author: "Dr. Sophie Rousseau",
      uploadDate: "2024-08-25",
      modifiedDate: "2024-09-08",
      size: "4.1 MB",
      confidentiality: "Restreint",
      relevanceScore: 72,
      snippet: "Cette recherche explore les applications pratiques de la mécanique quantique dans le développement de nouvelles technologies...",
      tags: ["Physique", "Quantique", "Recherche"],
      thumbnail: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=100&h=140&fit=crop",
      hasAccess: true
    }
  ];

  const displayResults = results?.length > 0 ? results : mockResults;

  const handleSortChange = (value) => {
    setSortBy(value);
    onSort && onSort(value);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const selectableIds = displayResults?.filter(doc => doc?.hasAccess)?.map(doc => doc?.id);
      onDocumentSelect(selectableIds);
    } else {
      onDocumentSelect([]);
    }
  };

  const handleDocumentCheck = (documentId, checked) => {
    if (checked) {
      onDocumentSelect([...selectedDocuments, documentId]);
    } else {
      onDocumentSelect(selectedDocuments?.filter(id => id !== documentId));
    }
  };

  const getConfidentialityColor = (level) => {
    switch (level) {
      case 'Public': return 'text-success';
      case 'Interne': return 'text-accent';
      case 'Confidentiel': return 'text-warning';
      case 'Restreint': return 'text-error';
      default: return 'text-muted-foreground';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Thèse': return 'GraduationCap';
      case 'Document administratif': return 'FileText';
      case 'Notes de cours': return 'BookOpen';
      case 'Dossier étudiant': return 'User';
      case 'Document de recherche': return 'Microscope';
      default: return 'File';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-8">
        <div className="flex items-center justify-center space-x-3">
          <Icon name="Loader2" size={24} className="animate-spin text-primary" />
          <span className="text-muted-foreground font-body">Recherche en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      {/* Results Header */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-xl font-heading font-semibold text-foreground">
              Résultats de recherche
            </h2>
            <p className="text-sm text-muted-foreground font-body mt-1">
              {totalResults || displayResults?.length} document{(totalResults || displayResults?.length) > 1 ? 's' : ''} trouvé{(totalResults || displayResults?.length) > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Select
              options={sortOptions}
              value={sortBy}
              onChange={handleSortChange}
              placeholder="Trier par"
              className="w-40"
            />

            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                iconName="List"
                onClick={() => setViewMode('table')}
                className="rounded-r-none border-r border-border"
                title="Vue tableau"
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

            <Select
              options={exportFormats}
              placeholder="Exporter"
              onChange={(format) => onExport && onExport(format)}
              className="w-32"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedDocuments?.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md flex items-center justify-between">
            <span className="text-sm font-body text-muted-foreground">
              {selectedDocuments?.length} document{selectedDocuments?.length > 1 ? 's' : ''} sélectionné{selectedDocuments?.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" iconName="Download">
                Télécharger
              </Button>
              <Button variant="ghost" size="sm" iconName="Share">
                Partager
              </Button>
              <Button variant="ghost" size="sm" iconName="Archive">
                Archiver
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Results Content */}
      <div className="p-6">
        {displayResults?.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="Search" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-medium text-foreground mb-2">
              Aucun résultat trouvé
            </h3>
            <p className="text-muted-foreground font-body">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4">
                    <Checkbox
                      checked={selectedDocuments?.length === displayResults?.filter(doc => doc?.hasAccess)?.length}
                      onChange={(e) => handleSelectAll(e?.target?.checked)}
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-heading font-medium text-foreground">Document</th>
                  <th className="text-left py-3 px-4 font-heading font-medium text-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-heading font-medium text-foreground">Département</th>
                  <th className="text-left py-3 px-4 font-heading font-medium text-foreground">Auteur</th>
                  <th className="text-left py-3 px-4 font-heading font-medium text-foreground">Pertinence</th>
                  <th className="text-left py-3 pl-4 font-heading font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayResults?.map((document) => (
                  <tr key={document?.id} className="border-b border-border hover:bg-muted transition-colors duration-200">
                    <td className="py-4 pr-4">
                      <Checkbox
                        checked={selectedDocuments?.includes(document?.id)}
                        onChange={(e) => handleDocumentCheck(document?.id, e?.target?.checked)}
                        disabled={!document?.hasAccess}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-start space-x-3">
                        <Image
                          src={document?.thumbnail}
                          alt={document?.title}
                          className="w-12 h-16 object-cover rounded border border-border flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-body font-medium text-foreground truncate">
                            {document?.title}
                          </h4>
                          <p className="text-sm text-muted-foreground font-body mt-1 line-clamp-2">
                            {document?.snippet}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            {document?.tags?.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-accent/10 text-accent text-xs rounded font-caption"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Icon name={getTypeIcon(document?.type)} size={16} className="text-muted-foreground" />
                        <span className="text-sm font-body text-foreground">{document?.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-body text-foreground">{document?.department}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-body text-foreground">{document?.author}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${document?.relevanceScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-caption text-muted-foreground">
                          {document?.relevanceScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pl-4">
                      <div className="flex items-center space-x-2">
                        {document?.hasAccess ? (
                          <>
                            <Button variant="ghost" size="sm" iconName="Eye" title="Voir" />
                            <Button variant="ghost" size="sm" iconName="Download" title="Télécharger" />
                          </>
                        ) : (
                          <span className="text-sm text-error font-body">Accès restreint</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayResults?.map((document) => (
              <div
                key={document?.id}
                className="border border-border rounded-lg p-4 hover:shadow-card transition-shadow duration-200"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <Checkbox
                    checked={selectedDocuments?.includes(document?.id)}
                    onChange={(e) => handleDocumentCheck(document?.id, e?.target?.checked)}
                    disabled={!document?.hasAccess}
                  />
                  <Image
                    src={document?.thumbnail}
                    alt={document?.title}
                    className="w-16 h-20 object-cover rounded border border-border flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-body font-medium text-foreground line-clamp-2 mb-1">
                      {document?.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground font-body">
                      <Icon name={getTypeIcon(document?.type)} size={14} />
                      <span>{document?.type}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground font-body line-clamp-3 mb-3">
                  {document?.snippet}
                </p>

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-body text-foreground">{document?.author}</span>
                  <span className={`font-body ${getConfidentialityColor(document?.confidentiality)}`}>
                    {document?.confidentiality}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${document?.relevanceScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-caption text-muted-foreground">
                      {document?.relevanceScore}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {document?.hasAccess ? (
                      <>
                        <Button variant="ghost" size="sm" iconName="Eye" />
                        <Button variant="ghost" size="sm" iconName="Download" />
                      </>
                    ) : (
                      <Icon name="Lock" size={16} className="text-error" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;