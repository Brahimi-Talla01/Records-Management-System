import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const BatchUploadManager = ({ uploadQueue, onApplyBatchMetadata, onProcessBatch }) => {
  const [batchMetadata, setBatchMetadata] = useState({
    category: '',
    department: '',
    confidentialityLevel: 'public',
    accessPermissions: 'department',
    retentionPeriod: '5',
    tags: [],
    enableOCR: true,
    requiresApproval: false
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isApplying, setIsApplying] = useState(false);

  const categoryOptions = [
    { value: 'student-files', label: 'Dossiers étudiants' },
    { value: 'theses', label: 'Thèses et mémoires' },
    { value: 'course-notes', label: 'Notes de cours' },
    { value: 'administrative', label: 'Documents administratifs' },
    { value: 'research', label: 'Documents de recherche' },
    { value: 'exams', label: 'Examens et évaluations' },
    { value: 'certificates', label: 'Certificats et diplômes' }
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
    { value: 'administration', label: 'Administration' }
  ];

  const confidentialityOptions = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Interne' },
    { value: 'confidential', label: 'Confidentiel' },
    { value: 'restricted', label: 'Restreint' }
  ];

  const accessOptions = [
    { value: 'public', label: 'Public' },
    { value: 'department', label: 'Département uniquement' },
    { value: 'restricted', label: 'Accès restreint' },
    { value: 'private', label: 'Privé' }
  ];

  const retentionOptions = [
    { value: '1', label: '1 an' },
    { value: '3', label: '3 ans' },
    { value: '5', label: '5 ans' },
    { value: '10', label: '10 ans' },
    { value: '25', label: '25 ans' },
    { value: 'permanent', label: 'Permanent' }
  ];

  const handleMetadataChange = (field, value) => {
    setBatchMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelection = (fileId, isSelected) => {
    setSelectedFiles(prev => {
      if (isSelected) {
        return [...prev, fileId];
      } else {
        return prev?.filter(id => id !== fileId);
      }
    });
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedFiles(uploadQueue?.map(file => file?.id));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleApplyMetadata = async () => {
    setIsApplying(true);
    try {
      await onApplyBatchMetadata(selectedFiles, batchMetadata);
    } finally {
      setIsApplying(false);
    }
  };

  const handleProcessBatch = () => {
    onProcessBatch(selectedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.')?.pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'FileText';
      case 'doc': case'docx':
        return 'FileText';
      case 'xls': case'xlsx':
        return 'Sheet';
      case 'jpg': case'jpeg': case'png':
        return 'Image';
      default:
        return 'File';
    }
  };

  if (uploadQueue?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
        <Icon name="Upload" size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
          Aucun fichier en attente
        </h3>
        <p className="text-muted-foreground font-body">
          Téléchargez des fichiers pour utiliser le traitement par lot
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon name="Package" size={24} className="text-primary" />
            <div>
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Traitement par lot
              </h3>
              <p className="text-sm text-muted-foreground font-body">
                Appliquez les mêmes métadonnées à plusieurs fichiers
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground font-caption">
            {selectedFiles?.length} / {uploadQueue?.length} sélectionnés
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* File Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-body font-medium text-foreground">
              Sélection des fichiers
            </h4>
            <Checkbox
              label="Tout sélectionner"
              checked={selectedFiles?.length === uploadQueue?.length}
              onChange={(e) => handleSelectAll(e?.target?.checked)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
            {uploadQueue?.map((file) => (
              <div
                key={file?.id}
                className={`flex items-center space-x-3 p-3 border-b border-border last:border-b-0 ${
                  selectedFiles?.includes(file?.id) ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedFiles?.includes(file?.id)}
                  onChange={(e) => handleFileSelection(file?.id, e?.target?.checked)}
                />
                
                <Icon 
                  name={getFileIcon(file?.name)} 
                  size={20} 
                  className="text-muted-foreground flex-shrink-0" 
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium text-foreground truncate">
                    {file?.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-caption">
                    {formatFileSize(file?.size)}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {file?.status === 'completed' && (
                    <Icon name="CheckCircle" size={16} className="text-success" />
                  )}
                  {file?.status === 'error' && (
                    <Icon name="XCircle" size={16} className="text-error" />
                  )}
                  {file?.status === 'uploading' && (
                    <Icon name="Loader2" size={16} className="text-warning animate-spin" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Batch Metadata Form */}
        {selectedFiles?.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-body font-medium text-foreground">
              Métadonnées communes
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Select
                label="Catégorie"
                options={categoryOptions}
                value={batchMetadata?.category}
                onChange={(value) => handleMetadataChange('category', value)}
                placeholder="Sélectionnez une catégorie"
              />

              <Select
                label="Département"
                options={departmentOptions}
                value={batchMetadata?.department}
                onChange={(value) => handleMetadataChange('department', value)}
                placeholder="Sélectionnez un département"
              />

              <Select
                label="Niveau de confidentialité"
                options={confidentialityOptions}
                value={batchMetadata?.confidentialityLevel}
                onChange={(value) => handleMetadataChange('confidentialityLevel', value)}
              />

              <Select
                label="Permissions d'accès"
                options={accessOptions}
                value={batchMetadata?.accessPermissions}
                onChange={(value) => handleMetadataChange('accessPermissions', value)}
              />

              <Select
                label="Période de rétention"
                options={retentionOptions}
                value={batchMetadata?.retentionPeriod}
                onChange={(value) => handleMetadataChange('retentionPeriod', value)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Checkbox
                label="Activer l'OCR"
                description="Reconnaissance optique de caractères"
                checked={batchMetadata?.enableOCR}
                onChange={(e) => handleMetadataChange('enableOCR', e?.target?.checked)}
              />

              <Checkbox
                label="Nécessite une approbation"
                description="Les documents doivent être approuvés"
                checked={batchMetadata?.requiresApproval}
                onChange={(e) => handleMetadataChange('requiresApproval', e?.target?.checked)}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {selectedFiles?.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground font-body">
              {selectedFiles?.length} fichier{selectedFiles?.length > 1 ? 's' : ''} sélectionné{selectedFiles?.length > 1 ? 's' : ''}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                iconName="Settings"
                iconPosition="left"
                iconSize={16}
                onClick={handleApplyMetadata}
                loading={isApplying}
                disabled={!batchMetadata?.category || !batchMetadata?.department}
              >
                Appliquer les métadonnées
              </Button>

              <Button
                variant="default"
                iconName="Play"
                iconPosition="left"
                iconSize={16}
                onClick={handleProcessBatch}
                disabled={selectedFiles?.some(id => {
                  const file = uploadQueue?.find(f => f?.id === id);
                  return !file || file?.status === 'uploading';
                })}
              >
                Traiter le lot
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchUploadManager;