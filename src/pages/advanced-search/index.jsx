import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SearchForm from './components/SearchForm';
import SearchResults from './components/SearchResults';
import SavedSearches from './components/SavedSearches';
import SearchFilters from './components/SearchFilters';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const AdvancedSearch = () => {
  const [user] = useState({
    id: 1,
    name: "Ibrahim",
    email: "ib@gmail.com",
    role: "admin"
  });

  const [searchState, setSearchState] = useState({
    isLoading: false,
    hasSearched: false,
    results: [],
    totalResults: 0,
    searchCriteria: null
  });

  const [filters, setFilters] = useState({});
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    document.title = "Recherche avancée - UniArchive";
  }, []);

  const handleSearch = async (criteria) => {
    setSearchState(prev => ({
      ...prev,
      isLoading: true,
      searchCriteria: criteria
    }));

    // Simulate API call
    setTimeout(() => {
      // Mock search results based on criteria
      const mockResults = generateMockResults(criteria);
      
      setSearchState({
        isLoading: false,
        hasSearched: true,
        results: mockResults,
        totalResults: mockResults?.length,
        searchCriteria: criteria
      });
    }, 1500);
  };

  const generateMockResults = (criteria) => {
    // This would normally be an API call
    const baseResults = [
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
      }
    ];

    // Filter results based on criteria
    return baseResults?.filter(result => {
      if (criteria?.keywords && !result?.title?.toLowerCase()?.includes(criteria?.keywords?.toLowerCase()) && 
          !result?.snippet?.toLowerCase()?.includes(criteria?.keywords?.toLowerCase())) {
        return false;
      }
      if (criteria?.documentType && result?.type !== criteria?.documentType) {
        return false;
      }
      if (criteria?.departments?.length && !criteria?.departments?.includes(result?.department?.toLowerCase())) {
        return false;
      }
      if (criteria?.author && !result?.author?.toLowerCase()?.includes(criteria?.author?.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  const handleResetSearch = () => {
    setSearchState({
      isLoading: false,
      hasSearched: false,
      results: [],
      totalResults: 0,
      searchCriteria: null
    });
    setFilters({});
    setSelectedDocuments([]);
  };

  const handleLoadSavedSearch = (criteria) => {
    handleSearch(criteria);
  };

  const handleDeleteSavedSearch = (searchId) => {
    console.log('Deleting saved search:', searchId);
    // Implementation would go here
  };

  const handleSortResults = (sortBy) => {
    const sortedResults = [...searchState?.results]?.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a?.title?.localeCompare(b?.title);
        case 'date_modified':
          return new Date(b.modifiedDate) - new Date(a.modifiedDate);
        case 'date_uploaded':
          return new Date(b.uploadDate) - new Date(a.uploadDate);
        case 'size':
          return parseFloat(b?.size) - parseFloat(a?.size);
        case 'relevance':
        default:
          return b?.relevanceScore - a?.relevanceScore;
      }
    });

    setSearchState(prev => ({
      ...prev,
      results: sortedResults
    }));
  };

  const handleExportResults = (format) => {
    console.log('Exporting results in format:', format);
    // Implementation would go here
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleLogout = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">
                  Recherche avancée
                </h1>
                <p className="text-muted-foreground font-body mt-2">
                  Trouvez rapidement les documents dont vous avez besoin avec des critères de recherche précis
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  iconName="History"
                  iconPosition="left"
                  iconSize={16}
                  className="font-body"
                >
                  Historique
                </Button>
                <Button
                  variant="outline"
                  iconName="HelpCircle"
                  iconPosition="left"
                  iconSize={16}
                  className="font-body"
                >
                  Aide
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar - Search Form and Saved Searches */}
            <div className="lg:col-span-1 space-y-6">
              <SearchForm
                onSearch={handleSearch}
                onReset={handleResetSearch}
                isLoading={searchState?.isLoading}
              />
              
              <SavedSearches
                onLoadSearch={handleLoadSavedSearch}
                onDeleteSearch={handleDeleteSavedSearch}
              />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <div className="w-full grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Search Results */}
                <div className={`${showFilters ? 'xl:col-span-3' : 'xl:col-span-4'}`}>
                  {searchState?.hasSearched ? (
                    <SearchResults
                      results={searchState?.results}
                      totalResults={searchState?.totalResults}
                      isLoading={searchState?.isLoading}
                      onSort={handleSortResults}
                      onExport={handleExportResults}
                      onDocumentSelect={setSelectedDocuments}
                      selectedDocuments={selectedDocuments}
                    />
                  ) : (
                    <div className="bg-card border border-border rounded-lg shadow-card p-12">
                      <div className="text-center">
                        <Icon name="Search" size={64} className="text-muted-foreground mx-auto mb-6" />
                        <h2 className="text-2xl font-heading font-semibold text-foreground mb-4">
                          Commencez votre recherche
                        </h2>
                        <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto">
                          Utilisez le formulaire de recherche pour trouver des documents spécifiques dans la base de données universitaire
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                          <div className="p-4 border border-border rounded-lg">
                            <Icon name="FileText" size={32} className="text-primary mx-auto mb-3" />
                            <h3 className="font-body font-medium text-foreground mb-2">Documents</h3>
                            <p className="text-sm text-muted-foreground font-body">
                              Recherchez parmi plus de 10,000 documents
                            </p>
                          </div>
                          <div className="p-4 border border-border rounded-lg">
                            <Icon name="Filter" size={32} className="text-primary mx-auto mb-3" />
                            <h3 className="font-body font-medium text-foreground mb-2">Filtres avancés</h3>
                            <p className="text-sm text-muted-foreground font-body">
                              Affinez vos résultats avec des critères précis
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - Filters */}
                {showFilters && searchState?.hasSearched && (
                  <div className="xl:col-span-1">
                    <div className="sticky top-24">
                      <SearchFilters
                        activeFilters={filters}
                        onFilterChange={handleFilterChange}
                        resultCount={searchState?.totalResults}
                        onClearFilters={handleClearFilters}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle Filters Button for Mobile */}
              {searchState?.hasSearched && (
                <div className="xl:hidden mt-6">
                  <Button
                    variant="outline"
                    iconName={showFilters ? "EyeOff" : "Eye"}
                    iconPosition="left"
                    iconSize={16}
                    onClick={() => setShowFilters(!showFilters)}
                    fullWidth
                    className="font-body"
                  >
                    {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-12 bg-card border border-border rounded-lg shadow-card p-6">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
              Actions rapides
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                iconName="Upload"
                iconPosition="left"
                iconSize={16}
                onClick={() => window.location.href = '/document-upload'}
                fullWidth
                className="font-body"
              >
                Télécharger un document
              </Button>
              <Button
                variant="outline"
                iconName="FolderOpen"
                iconPosition="left"
                iconSize={16}
                onClick={() => window.location.href = '/document-library'}
                fullWidth
                className="font-body"
              >
                Parcourir la bibliothèque
              </Button>
              <Button
                variant="outline"
                iconName="BarChart3"
                iconPosition="left"
                iconSize={16}
                onClick={() => window.location.href = '/dashboard'}
                fullWidth
                className="font-body"
              >
                Voir les statistiques
              </Button>
              <Button
                variant="outline"
                iconName="Settings"
                iconPosition="left"
                iconSize={16}
                fullWidth
                className="font-body"
              >
                Préférences de recherche
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdvancedSearch;