import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const DocumentMetadataForm = ({ onSubmit, isSubmitting, selectedFiles }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    department: '',
    confidentialityLevel: 'public',
    tags: [],
    description: '',
    retentionPeriod: '5',
    accessPermissions: 'department',
    requiresApproval: false,
    enableOCR: true,
    language: 'fr'
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  const categoryOptions = [
    { value: 'student-files', label: 'Dossiers étudiants' },
    { value: 'theses', label: 'Thèses et mémoires' },
    { value: 'course-notes', label: 'Notes de cours' },
    { value: 'administrative', label: 'Documents administratifs' },
    { value: 'research', label: 'Documents de recherche' },
    { value: 'exams', label: 'Examens et évaluations' },
    { value: 'certificates', label: 'Certificats et diplômes' },
    { value: 'other', label: 'Autres' }
  ];

  const departmentOptions = [
    { value: 'informatique', label: 'Informatique' },
    { value: 'mathematiques', label: 'Mathématiques' },
    { value: 'physique', label: 'Physique' },
    { value: 'chimie', label: 'Chimie' },
    { value: 'biologie', label: 'Biologie' },
    { value: 'lettres', label: 'Lettres et Langues' },
    { value: 'histoire', label: 'Histoire' },
    { value: 'economie', label: 'Économie et Gestion' },
    { value: 'droit', label: 'Droit' },
    { value: 'medecine', label: 'Médecine' },
    { value: 'administration', label: 'Administration' }
  ];

  const confidentialityOptions = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Interne' },
    { value: 'confidential', label: 'Confidentiel' },
    { value: 'restricted', label: 'Restreint' }
  ];

  const retentionOptions = [
    { value: '1', label: '1 an' },
    { value: '3', label: '3 ans' },
    { value: '5', label: '5 ans' },
    { value: '10', label: '10 ans' },
    { value: '25', label: '25 ans' },
    { value: 'permanent', label: 'Permanent' }
  ];

  const accessOptions = [
    { value: 'public', label: 'Public' },
    { value: 'department', label: 'Département uniquement' },
    { value: 'restricted', label: 'Accès restreint' },
    { value: 'private', label: 'Privé' }
  ];

  const languageOptions = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'Anglais' },
    { value: 'es', label: 'Espagnol' },
    { value: 'de', label: 'Allemand' },
    { value: 'it', label: 'Italien' }
  ];

  const suggestedTags = [
    'urgent', 'archive', 'personnel', 'académique', 'recherche', 
    'examen', 'projet', 'stage', 'diplôme', 'certification',
    'budget', 'rapport', 'présentation', 'cours', 'td'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddTag = (tag) => {
    if (tag && !formData?.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev?.tags, tag]
      }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev?.tags?.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e?.key === 'Enter') {
      e?.preventDefault();
      handleAddTag(tagInput?.trim());
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData?.title?.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    if (!formData?.category) {
      newErrors.category = 'La catégorie est requise';
    }

    if (!formData?.department) {
      newErrors.department = 'Le département est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="flex items-center space-x-3 mb-6">
        <Icon name="FileText" size={24} className="text-primary" />
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            Métadonnées du document
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            {selectedFiles?.length > 0 
              ? `${selectedFiles?.length} fichier${selectedFiles?.length > 1 ? 's' : ''} sélectionné${selectedFiles?.length > 1 ? 's' : ''}`
              : 'Aucun fichier sélectionné'
            }
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Input
            label="Titre du document"
            type="text"
            placeholder="Entrez le titre du document"
            value={formData?.title}
            onChange={(e) => handleInputChange('title', e?.target?.value)}
            error={errors?.title}
            required
            className="lg:col-span-2"
          />

          <Select
            label="Catégorie"
            options={categoryOptions}
            value={formData?.category}
            onChange={(value) => handleInputChange('category', value)}
            placeholder="Sélectionnez une catégorie"
            error={errors?.category}
            required
          />

          <Select
            label="Département"
            options={departmentOptions}
            value={formData?.department}
            onChange={(value) => handleInputChange('department', value)}
            placeholder="Sélectionnez un département"
            error={errors?.department}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">
            Description (optionnelle)
          </label>
          <textarea
            value={formData?.description}
            onChange={(e) => handleInputChange('description', e?.target?.value)}
            placeholder="Décrivez le contenu du document..."
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">
            Étiquettes
          </label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Ajouter une étiquette..."
                value={tagInput}
                onChange={(e) => setTagInput(e?.target?.value)}
                onKeyPress={handleTagInputKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                iconName="Plus"
                onClick={() => handleAddTag(tagInput?.trim())}
                disabled={!tagInput?.trim()}
              >
                Ajouter
              </Button>
            </div>

            {/* Current Tags */}
            {formData?.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData?.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-caption"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-primary/70"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested Tags */}
            <div>
              <p className="text-xs text-muted-foreground font-caption mb-2">Étiquettes suggérées:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags?.filter(tag => !formData?.tags?.includes(tag))?.slice(0, 8)?.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-caption hover:bg-muted/80 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security and Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Select
            label="Niveau de confidentialité"
            options={confidentialityOptions}
            value={formData?.confidentialityLevel}
            onChange={(value) => handleInputChange('confidentialityLevel', value)}
          />

          <Select
            label="Permissions d'accès"
            options={accessOptions}
            value={formData?.accessPermissions}
            onChange={(value) => handleInputChange('accessPermissions', value)}
          />

          <Select
            label="Période de rétention"
            options={retentionOptions}
            value={formData?.retentionPeriod}
            onChange={(value) => handleInputChange('retentionPeriod', value)}
          />
        </div>

        {/* Processing Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-body font-medium text-foreground">Options de traitement</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Checkbox
              label="Activer l'OCR (reconnaissance de texte)"
              description="Extraire automatiquement le texte des documents scannés"
              checked={formData?.enableOCR}
              onChange={(e) => handleInputChange('enableOCR', e?.target?.checked)}
            />

            <Checkbox
              label="Nécessite une approbation"
              description="Le document doit être approuvé avant publication"
              checked={formData?.requiresApproval}
              onChange={(e) => handleInputChange('requiresApproval', e?.target?.checked)}
            />
          </div>

          <Select
            label="Langue du document"
            options={languageOptions}
            value={formData?.language}
            onChange={(value) => handleInputChange('language', value)}
            className="lg:w-1/3"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history?.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            iconName="Upload"
            iconPosition="left"
            iconSize={16}
            disabled={selectedFiles?.length === 0}
          >
            Commencer le téléchargement
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DocumentMetadataForm;