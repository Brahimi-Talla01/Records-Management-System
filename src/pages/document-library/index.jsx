import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import DocumentActionToolbar from '../../components/ui/DocumentActionToolbar';
import FolderNavigation from './components/FolderNavigation';
import DocumentFilters from './components/DocumentFilters';
import DocumentTable from './components/DocumentTable';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import BulkActionBar from './components/BulkActionBar';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const DocumentLibrary = () => {
  const [user] = useState({
    id: 1,
    name: "Marie Dubois",
    role: "admin",
    email: "marie.dubois@universite.fr"
  });

  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [folders, setFolders] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [previewDocument, setPreviewDocument] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data
  const mockDocuments = [
    {
      id: 1,
      name: "Rapport_Recherche_IA_2024.pdf",
      type: "pdf",
      category: "Documents de recherche",
      department: "Informatique",
      size: 2457600,
      uploadDate: "2024-09-15T10:30:00Z",
      modifiedDate: "2024-09-20T14:15:00Z",
      confidentiality: "internal",
      author: "Dr. Jean Martin",
      description: "Rapport annuel sur les avancées en intelligence artificielle au sein du département",
      tags: ["IA", "recherche", "2024", "rapport"],
      permissions: ["read", "download", "share"]
    },
    {
      id: 2,
      name: "Dossier_Etudiant_12345.docx",
      type: "docx",
      category: "Dossiers étudiants",
      department: "Administration",
      size: 1024000,
      uploadDate: "2024-09-10T09:15:00Z",
      modifiedDate: "2024-09-25T16:45:00Z",
      confidentiality: "confidential",
      author: "Service Scolarité",
      description: "Dossier académique complet de l\'étudiant Pierre Durand",
      tags: ["étudiant", "dossier", "scolarité"],
      permissions: ["read", "download"]
    },
    {
      id: 3,
      name: "These_Mathematiques_Appliquees.pdf",
      type: "pdf",
      category: "Thèses",
      department: "Mathématiques",
      size: 15728640,
      uploadDate: "2024-08-20T14:20:00Z",
      modifiedDate: "2024-09-01T11:30:00Z",
      confidentiality: "public",
      author: "Sophie Laurent",
      description: "Thèse de doctorat sur les applications des mathématiques en modélisation climatique",
      tags: ["thèse", "mathématiques", "climat", "modélisation"],
      permissions: ["read", "download", "share"]
    },
    {
      id: 4,
      name: "Budget_Departement_2024.xlsx",
      type: "xlsx",
      category: "Documents administratifs",
      department: "Administration",
      size: 512000,
      uploadDate: "2024-09-01T08:00:00Z",
      modifiedDate: "2024-09-28T17:20:00Z",
      confidentiality: "restricted",
      author: "Direction Financière",
      description: "Budget prévisionnel et réalisé pour l\'année 2024",
      tags: ["budget", "finances", "2024"],
      permissions: ["read"]
    },
    {
      id: 5,
      name: "Cours_Physique_Quantique_L3.pptx",
      type: "pptx",
      category: "Notes de cours",
      department: "Physique",
      size: 8388608,
      uploadDate: "2024-09-05T13:45:00Z",
      modifiedDate: "2024-09-22T10:15:00Z",
      confidentiality: "internal",
      author: "Prof. Michel Rousseau",
      description: "Support de cours pour le module de physique quantique niveau L3",
      tags: ["cours", "physique", "quantique", "L3"],
      permissions: ["read", "download", "share"]
    },
    {
      id: 6,
      name: "Resultats_Enquete_Satisfaction.pdf",
      type: "pdf",
      category: "Documents administratifs",
      department: "Administration",
      size: 3145728,
      uploadDate: "2024-09-12T16:30:00Z",
      modifiedDate: "2024-09-18T09:45:00Z",
      confidentiality: "internal",
      author: "Service Qualité",
      description: "Résultats de l\'enquête de satisfaction étudiante pour l\'année académique 2023-2024",
      tags: ["enquête", "satisfaction", "étudiants", "qualité"],
      permissions: ["read", "download", "share"]
    }
  ];

  const mockFolders = [
    {
      id: 1,
      name: "Informatique",
      hasSubfolders: true,
      documentCount: 15,
      path: ["Informatique"]
    },
    {
      id: 2,
      name: "Mathématiques",
      hasSubfolders: true,
      documentCount: 8,
      path: ["Mathématiques"]
    },
    {
      id: 3,
      name: "Physique",
      hasSubfolders: true,
      documentCount: 12,
      path: ["Physique"]
    },
    {
      id: 4,
      name: "Administration",
      hasSubfolders: false,
      documentCount: 25,
      path: ["Administration"]
    },
    {
      id: 5,
      name: "Thèses",
      hasSubfolders: true,
      documentCount: 45,
      path: ["Thèses"]
    },
    {
      id: 6,
      name: "Archives",
      hasSubfolders: true,
      documentCount: 120,
      path: ["Archives"]
    }
  ];

  useEffect(() => {
    // Simulate loading
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDocuments(mockDocuments);
      setFilteredDocuments(mockDocuments);
      setFolders(mockFolders);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Apply filters and sorting
    let filtered = [...documents];

    // Apply filters
    if (filters?.type && filters?.type !== 'all') {
      if (filters?.type === 'student-files') {
        filtered = filtered?.filter(doc => doc?.category === 'Dossiers étudiants');
      } else if (filters?.type === 'theses') {
        filtered = filtered?.filter(doc => doc?.category === 'Thèses');
      } else if (filters?.type === 'administrative') {
        filtered = filtered?.filter(doc => doc?.category === 'Documents administratifs');
      } else if (filters?.type === 'course-notes') {
        filtered = filtered?.filter(doc => doc?.category === 'Notes de cours');
      } else if (filters?.type === 'research') {
        filtered = filtered?.filter(doc => doc?.category === 'Documents de recherche');
      }
    }

    if (filters?.department && filters?.department !== 'all') {
      filtered = filtered?.filter(doc => 
        doc?.department?.toLowerCase() === filters?.department?.toLowerCase()
      );
    }

    if (filters?.confidentiality && filters?.confidentiality !== 'all') {
      filtered = filtered?.filter(doc => doc?.confidentiality === filters?.confidentiality);
    }

    if (filters?.format && filters?.format !== 'all') {
      if (filters?.format === 'image') {
        filtered = filtered?.filter(doc => ['jpg', 'jpeg', 'png', 'gif']?.includes(doc?.type?.toLowerCase()));
      } else {
        filtered = filtered?.filter(doc => doc?.type?.toLowerCase()?.includes(filters?.format));
      }
    }

    if (filters?.startDate) {
      filtered = filtered?.filter(doc => 
        new Date(doc.uploadDate) >= new Date(filters.startDate)
      );
    }

    if (filters?.endDate) {
      filtered = filtered?.filter(doc => 
        new Date(doc.uploadDate) <= new Date(filters.endDate)
      );
    }

    if (filters?.author) {
      filtered = filtered?.filter(doc => 
        doc?.author?.toLowerCase()?.includes(filters?.author?.toLowerCase())
      );
    }

    if (filters?.tags) {
      const searchTags = filters?.tags?.toLowerCase()?.split(',')?.map(tag => tag?.trim());
      filtered = filtered?.filter(doc => 
        searchTags?.some(searchTag => 
          doc?.tags?.some(docTag => docTag?.toLowerCase()?.includes(searchTag))
        )
      );
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      let aValue = a?.[sortBy];
      let bValue = b?.[sortBy];

      if (sortBy === 'uploadDate' || sortBy === 'modifiedDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'size') {
        aValue = parseInt(aValue);
        bValue = parseInt(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase();
        bValue = bValue?.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDocuments(filtered);
  }, [documents, filters, sortBy, sortOrder]);

  const handleLogout = () => {
    window.location.href = '/login';
  };

  const handleUpload = () => {
    window.location.href = '/document-upload';
  };

  const handleSearch = (query) => {
    if (!query?.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const searchResults = documents?.filter(doc =>
      doc?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
      doc?.description?.toLowerCase()?.includes(query?.toLowerCase()) ||
      doc?.author?.toLowerCase()?.includes(query?.toLowerCase()) ||
      doc?.tags?.some(tag => tag?.toLowerCase()?.includes(query?.toLowerCase()))
    );

    setFilteredDocuments(searchResults);
  };

  const handleBulkAction = async (action, count) => {
    console.log(`Executing ${action} on ${count} documents`);
    
    // Simulate action processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Clear selection after action
    setSelectedDocuments([]);
    
    // Show success message (in real app, use toast/notification)
    alert(`Action "${action}" exécutée sur ${count} document(s)`);
  };

  const handleSort = (column, order) => {
    setSortBy(column);
    setSortOrder(order);
  };

  const handleDocumentAction = (action, document) => {
    switch (action) {
      case 'preview':
        setPreviewDocument(document);
        setIsPreviewOpen(true);
        break;
      case 'download':
        console.log('Downloading document:', document?.name);
        // Simulate download
        alert(`Téléchargement de "${document?.name}" commencé`);
        break;
      case 'share': console.log('Sharing document:', document?.name);
        alert(`Partage de "${document?.name}" - Fonctionnalité à implémenter`);
        break;
      case 'edit': console.log('Editing document metadata:', document?.name);
        alert(`Modification des métadonnées de "${document?.name}" - Fonctionnalité à implémenter`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleFolderNavigation = (path) => {
    setCurrentPath(path);
    // In real app, this would filter documents by folder
    console.log('Navigating to folder path:', path);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={handleLogout} />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Icon name="Loader2" size={48} className="text-primary mx-auto mb-4 animate-spin" />
              <p className="font-body text-muted-foreground">Chargement de la bibliothèque...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={handleLogout} />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <Breadcrumb />
          
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">
                  Bibliothèque de documents
                </h1>
                <p className="font-body text-muted-foreground mt-2">
                  Parcourez, recherchez et gérez tous vos documents universitaires
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="ScanLine"
                  iconPosition="left"
                  className="font-body"
                >
                  Scanner
                </Button>
                <Button
                  variant="default"
                  iconName="Upload"
                  iconPosition="left"
                  onClick={handleUpload}
                  className="font-body"
                >
                  Télécharger
                </Button>
              </div>
            </div>
          </div>

          {/* Folder Navigation */}
          <div className="mb-6">
            <FolderNavigation
              currentPath={currentPath}
              onNavigate={handleFolderNavigation}
              folders={folders}
            />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <DocumentFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              resultsCount={filteredDocuments?.length}
            />
          </div>

          {/* Action Toolbar */}
          <div className="mb-6">
            <DocumentActionToolbar
              onUpload={handleUpload}
              onSearch={handleSearch}
              onBulkAction={handleBulkAction}
              selectedCount={selectedDocuments?.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={(value) => handleSort(value, sortOrder)}
              showBulkActions={selectedDocuments?.length > 0}
            />
          </div>

          {/* Document Table/Grid */}
          <DocumentTable
            documents={filteredDocuments}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={setSelectedDocuments}
            onDocumentAction={handleDocumentAction}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            viewMode={viewMode}
          />

          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedCount={selectedDocuments?.length}
            onBulkAction={handleBulkAction}
            onClearSelection={() => setSelectedDocuments([])}
          />

          {/* Document Preview Modal */}
          <DocumentPreviewModal
            document={previewDocument}
            isOpen={isPreviewOpen}
            onClose={() => {
              setIsPreviewOpen(false);
              setPreviewDocument(null);
            }}
            onDownload={(doc) => handleDocumentAction('download', doc)}
            onShare={(doc) => handleDocumentAction('share', doc)}
            onEdit={(doc) => handleDocumentAction('edit', doc)}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentLibrary;