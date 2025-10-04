import { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const UploadZone = ({ onFilesSelected, acceptedFormats, maxFileSize, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e?.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e?.dataTransfer?.files);
    onFilesSelected(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e?.target?.files);
    onFilesSelected(files);
  };

  const handleBrowseClick = () => {
    fileInputRef?.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : isUploading
            ? 'border-warning bg-warning/5' :'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFormats?.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <Icon 
              name={isDragOver ? "Upload" : isUploading ? "Loader2" : "FileUp"} 
              size={32}
              className={isUploading ? "animate-spin" : ""}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-heading font-semibold text-foreground">
              {isDragOver 
                ? "Déposez vos fichiers ici" 
                : isUploading 
                ? "Téléchargement en cours..." :"Téléchargez vos documents"
              }
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              {isDragOver 
                ? "Relâchez pour commencer le téléchargement" :"Glissez-déposez vos fichiers ou cliquez pour parcourir"
              }
            </p>
          </div>

          {!isUploading && (
            <Button
              variant="outline"
              onClick={handleBrowseClick}
              iconName="FolderOpen"
              iconPosition="left"
              iconSize={16}
              className="font-body bg-accent"
            >
              Parcourir les fichiers
            </Button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground font-caption">
            <div className="flex items-center justify-center space-x-2">
              <Icon name="FileText" size={16} />
              <span>Formats acceptés</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Icon name="HardDrive" size={16} />
              <span>Taille max: {formatFileSize(maxFileSize)}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Icon name="Shield" size={16} />
              <span>Chiffrement automatique</span>
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {acceptedFormats?.map((format) => (
              <span 
                key={format}
                className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-caption"
              >
                {format?.replace('.', '')?.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;