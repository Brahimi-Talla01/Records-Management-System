/**
 * File d'attente de dépôt (F4.1) : progression réelle (XHR), annulation par
 * AbortController, nouvelle tentative, titre modifiable avant envoi et statut
 * OCR après dépôt.
 */
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { formatFileSize } from '../../../lib/formatters';

const STATUS = {
  pending: { icon: 'Clock', className: 'text-muted-foreground', label: 'En attente' },
  uploading: { icon: 'Loader2', className: 'animate-spin text-warning', label: 'Dépôt…' },
  completed: { icon: 'CheckCircle', className: 'text-success', label: 'Terminé' },
  canceled: { icon: 'Ban', className: 'text-muted-foreground', label: 'Annulé' },
  error: { icon: 'XCircle', className: 'text-error', label: 'Erreur' },
};

const OCR_LABELS = {
  processing: 'OCR en traitement',
  completed: 'OCR terminé',
  disabled: 'OCR désactivé',
};

const UploadProgress = ({
  uploadQueue = [],
  onRemoveFile,
  onRetryUpload,
  onCancelUpload,
  onRenameFile,
  onClearCompleted,
}) => {
  if (uploadQueue.length === 0) return null;

  const completed = uploadQueue.filter((file) => file.status === 'completed').length;
  const finished = uploadQueue.every((file) => file.status === 'completed');

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-semibold text-foreground">
            File d'attente de dépôt
          </h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-muted-foreground font-caption">
              {completed} / {uploadQueue.length} terminés
            </span>
            {finished && onClearCompleted && (
              <Button variant="ghost" size="sm" iconName="Trash2" onClick={onClearCompleted}>
                Vider
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {uploadQueue.map((file) => {
          const status = STATUS[file.status] || STATUS.pending;
          const editable = ['pending', 'error', 'canceled'].includes(file.status);
          return (
            <div key={file.id} className="p-4 border-b border-border last:border-b-0">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <Icon name={status.icon} size={16} className={status.className} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    {editable && onRenameFile ? (
                      <Input
                        value={file.title || ''}
                        onChange={(event) => onRenameFile(file.id, event.target.value)}
                        aria-label={`Titre de ${file.name}`}
                        className="h-8 max-w-xs"
                      />
                    ) : (
                      <p className="text-sm font-body font-medium text-foreground truncate">
                        {file.title || file.name}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground font-caption whitespace-nowrap">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{status.label}</span>
                    </div>
                  </div>

                  {file.status === 'uploading' && (
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground font-caption">
                        {file.progress || 0}%
                      </p>
                    </div>
                  )}

                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-error font-caption mt-1">{file.error}</p>
                  )}

                  {file.status === 'completed' && (
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-success font-caption">Déposé avec succès</span>
                      {file.ocrStatus && (
                        <span className="text-xs text-muted-foreground font-caption">
                          {OCR_LABELS[file.ocrStatus] || file.ocrStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center space-x-1">
                  {file.status === 'uploading' && onCancelUpload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="X"
                      onClick={() => onCancelUpload(file.id)}
                      title="Annuler"
                    />
                  )}
                  {['error', 'canceled'].includes(file.status) && onRetryUpload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="RotateCcw"
                      onClick={() => onRetryUpload(file.id)}
                      title="Réessayer"
                    />
                  )}
                  {file.status !== 'uploading' && onRemoveFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="Trash2"
                      onClick={() => onRemoveFile(file.id)}
                      title="Retirer de la file"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UploadProgress;
