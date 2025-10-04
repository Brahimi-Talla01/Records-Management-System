import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const SearchForm = ({ onSearch, onReset, isLoading = false }) => {
  const [searchCriteria, setSearchCriteria] = useState({
    keywords: '',
    documentType: '',
    departments: [],
    dateRange: {
      uploadFrom: '',
      uploadTo: '',
      modifiedFrom: '',
      modifiedTo: ''
    },
    author: '',
    confidentialityLevel: '',
    tags: '',
    searchMode: 'all',
    exactPhrase: false,
    includeOCR: true
  });

  const documentTypes = [
    { value: 'student_files', label: 'Dossiers étudiants' },
    { value: 'theses', label: 'Thèses et mémoires' },
    { value: 'administrative', label: 'Documents administratifs' },
    { value: 'course_notes', label: 'Notes de cours' },
    { value: 'research', label: 'Documents de recherche' },
    { value: 'official', label: 'Documents officiels' }
  ];

  const departments = [
    { value: 'informatique', label: 'Informatique' },
    { value: 'mathematiques', label: 'Mathématiques' },
    { value: 'physique', label: 'Physique' },
    { value: 'chimie', label: 'Chimie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'lettres', label: 'Lettres et Langues' },
    { value: 'histoire', label: 'Histoire' },
    { value: 'droit', label: 'Droit' },
    { value: 'economie', label: 'Économie' },
    { value: 'administration', label: 'Administration' }
  ];

  const confidentialityLevels = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Interne' },
    { value: 'confidential', label: 'Confidentiel' },
    { value: 'restricted', label: 'Restreint' }
  ];

  const searchModes = [
    { value: 'all', label: 'Tous les mots' },
    { value: 'any', label: 'Au moins un mot' },
    { value: 'exact', label: 'Expression exacte' }
  ];

  const handleInputChange = (field, value) => {
    if (field?.includes('.')) {
      const [parent, child] = field?.split('.');
      setSearchCriteria(prev => ({
        ...prev,
        [parent]: {
          ...prev?.[parent],
          [child]: value
        }
      }));
    } else {
      setSearchCriteria(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSearch(searchCriteria);
  };

  const handleReset = () => {
    setSearchCriteria({
      keywords: '',
      documentType: '',
      departments: [],
      dateRange: {
        uploadFrom: '',
        uploadTo: '',
        modifiedFrom: '',
        modifiedTo: ''
      },
      author: '',
      confidentialityLevel: '',
      tags: '',
      searchMode: 'all',
      exactPhrase: false,
      includeOCR: true
    });
    onReset();
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-heading font-semibold text-foreground flex items-center space-x-2">
          <Icon name="Search" size={24} />
          <span>Recherche avancée</span>
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Utilisez les critères ci-dessous pour affiner votre recherche
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Keywords Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-heading font-medium text-foreground">Mots-clés</h3>
          
          <Input
            label="Recherche textuelle"
            type="text"
            placeholder="Entrez vos mots-clés..."
            value={searchCriteria?.keywords}
            onChange={(e) => handleInputChange('keywords', e?.target?.value)}
            description="Recherche dans le titre, contenu et métadonnées"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Mode de recherche"
              options={searchModes}
              value={searchCriteria?.searchMode}
              onChange={(value) => handleInputChange('searchMode', value)}
              placeholder="Sélectionner le mode"
            />

            <div className="space-y-3">
              <Checkbox
                label="Expression exacte"
                checked={searchCriteria?.exactPhrase}
                onChange={(e) => handleInputChange('exactPhrase', e?.target?.checked)}
                description="Rechercher la phrase exacte"
              />
              <Checkbox
                label="Inclure contenu OCR"
                checked={searchCriteria?.includeOCR}
                onChange={(e) => handleInputChange('includeOCR', e?.target?.checked)}
                description="Rechercher dans le texte extrait des images"
              />
            </div>
          </div>
        </div>

        {/* Document Filters */}
        <div className="space-y-4">
          <h3 className="text-lg font-heading font-medium text-foreground">Filtres de documents</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Type de document"
              options={documentTypes}
              value={searchCriteria?.documentType}
              onChange={(value) => handleInputChange('documentType', value)}
              placeholder="Tous les types"
              clearable
            />

            <Select
              label="Départements"
              options={departments}
              value={searchCriteria?.departments}
              onChange={(value) => handleInputChange('departments', value)}
              placeholder="Tous les départements"
              multiple
              searchable
              clearable
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Auteur/Créateur"
              type="text"
              placeholder="Nom de l'auteur..."
              value={searchCriteria?.author}
              onChange={(e) => handleInputChange('author', e?.target?.value)}
            />

            <Select
              label="Niveau de confidentialité"
              options={confidentialityLevels}
              value={searchCriteria?.confidentialityLevel}
              onChange={(value) => handleInputChange('confidentialityLevel', value)}
              placeholder="Tous les niveaux"
              clearable
            />
          </div>

          <Input
            label="Tags"
            type="text"
            placeholder="Séparez les tags par des virgules..."
            value={searchCriteria?.tags}
            onChange={(e) => handleInputChange('tags', e?.target?.value)}
            description="Recherche par mots-clés associés aux documents"
          />
        </div>

        {/* Date Filters */}
        <div className="space-y-4">
          <h3 className="text-lg font-heading font-medium text-foreground">Filtres de dates</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-body font-medium text-muted-foreground">Date de téléchargement</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Du"
                  type="date"
                  value={searchCriteria?.dateRange?.uploadFrom}
                  onChange={(e) => handleInputChange('dateRange.uploadFrom', e?.target?.value)}
                />
                <Input
                  label="Au"
                  type="date"
                  value={searchCriteria?.dateRange?.uploadTo}
                  onChange={(e) => handleInputChange('dateRange.uploadTo', e?.target?.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-body font-medium text-muted-foreground">Date de modification</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Du"
                  type="date"
                  value={searchCriteria?.dateRange?.modifiedFrom}
                  onChange={(e) => handleInputChange('dateRange.modifiedFrom', e?.target?.value)}
                />
                <Input
                  label="Au"
                  type="date"
                  value={searchCriteria?.dateRange?.modifiedTo}
                  onChange={(e) => handleInputChange('dateRange.modifiedTo', e?.target?.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-border">
          <div className="flex items-center space-x-3">
            <Button
              type="submit"
              variant="default"
              iconName="Search"
              iconPosition="left"
              iconSize={16}
              loading={isLoading}
              className="font-body"
            >
              Rechercher
            </Button>
            
            <Button
              type="button"
              variant="outline"
              iconName="RotateCcw"
              iconPosition="left"
              iconSize={16}
              onClick={handleReset}
              className="font-body"
            >
              Réinitialiser
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="ghost"
              iconName="Save"
              iconPosition="left"
              iconSize={16}
              className="font-body text-muted-foreground"
            >
              Sauvegarder la recherche
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              iconName="History"
              iconPosition="left"
              iconSize={16}
              className="font-body text-muted-foreground"
            >
              Historique
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;