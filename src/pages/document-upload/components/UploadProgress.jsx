import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const UploadProgress = ({ uploadQueue, onRemoveFile, onRetryUpload }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <Icon name="Loader2" size={16} className="animate-spin text-warning" />;
      case 'completed':
        return <Icon name="CheckCircle" size={16} className="text-success" />;
      case 'error':
        return <Icon name="XCircle" size={16} className="text-error" />;
      case 'pending':
        return <Icon name="Clock" size={16} className="text-muted-foreground" />;
      default:
        return <Icon name="File" size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Téléchargement...';
      case 'completed':
        return 'Terminé';
      case 'error':
        return 'Erreur';
      case 'pending':
        return 'En attente';
      default:
        return 'Inconnu';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (uploadQueue?.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold text-foreground">
            File d'attente de téléchargement
          </h3>
          <span className="text-sm text-muted-foreground font-caption">
            {uploadQueue?.filter(f => f?.status === 'completed')?.length} / {uploadQueue?.length} terminés
          </span>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {uploadQueue?.map((file) => (
          <div key={file?.id} className="p-4 border-b border-border last:border-b-0">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getStatusIcon(file?.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-body font-medium text-foreground truncate">
                    {file?.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground font-caption">
                    <span>{formatFileSize(file?.size)}</span>
                    <span>•</span>
                    <span>{getStatusText(file?.status)}</span>
                  </div>
                </div>

                {file?.status === 'uploading' && (
                  <div className="space-y-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file?.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground font-caption">
                      <span>{file?.progress || 0}%</span>
                      {file?.estimatedTime && (
                        <span>Temps restant: {formatTime(file?.estimatedTime)}</span>
                      )}
                    </div>
                  </div>
                )}

                {file?.status === 'error' && file?.error && (
                  <p className="text-xs text-error font-caption mt-1">
                    {file?.error}
                  </p>
                )}

                {file?.status === 'completed' && (
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-success font-caption">
                      Téléchargé avec succès
                    </span>
                    {file?.ocrStatus && (
                      <span className="text-xs text-muted-foreground font-caption">
                        OCR: {file?.ocrStatus}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex items-center space-x-2">
                {file?.status === 'error' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="RotateCcw"
                    onClick={() => onRetryUpload(file?.id)}
                    title="Réessayer"
                  />
                )}
                
                {file?.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="X"
                    onClick={() => onRemoveFile(file?.id)}
                    title="Supprimer"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadProgress;