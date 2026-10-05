/**
 * Aperçu réel (F3.4) : `GET /documents/<id>/preview` en Blob, exposé via
 * `URL.createObjectURL` **révoquée au démontage** (fuite mémoire sinon).
 * Chiffrement transparent : le serveur déchiffre, le client ne voit que l'objet.
 */
import { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toAppError } from '../../../lib/errors';
import { documentsApi } from '../../../features/documents';

const PREVIEWABLE = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];

const DocumentPreviewModal = ({
  document: doc = null,
  isOpen = false,
  onClose = () => {},
  onDownload = () => {},
  onOpenDetail = () => {},
}) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    if (!isOpen || !doc?.document_id) {
      setUrl(null);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    documentsApi
      .preview(doc.document_id)
      .then((blob) => {
        if (cancelled) return;
        // Type serveur explicite et non apercevable → pas de faux rendu.
        if (blob.type && !PREVIEWABLE.includes(blob.type)) {
          setError('preview_not_supported');
          setLoading(false);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toAppError(err).message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, doc?.document_id]);

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Aperçu de ${doc.title}`}
        className="relative bg-card border border-border rounded-lg shadow-modal max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="FileText" size={20} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-semibold text-lg text-foreground truncate">
                {doc.title}
              </h2>
              <p className="font-body text-sm text-muted-foreground">
                {doc.is_encrypted ? 'Chiffré au repos — déchiffrement transparent' : 'Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              iconName="ExternalLink"
              iconPosition="left"
              onClick={() => onOpenDetail(doc)}
              className="font-body"
            >
              Ouvrir la fiche
            </Button>
            <Button
              variant="default"
              iconName="Download"
              iconPosition="left"
              onClick={() => onDownload(doc)}
              className="font-body"
            >
              Télécharger
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} title="Fermer">
              <Icon name="X" size={20} />
            </Button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-88px)] overflow-auto">
          {loading && <Skeleton className="h-96 w-full" />}

          {!loading && error && (
            <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center px-6">
                <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="font-body text-muted-foreground mb-4">
                  {typeof error === 'string' && error.length > 40
                    ? "Aperçu indisponible pour ce document."
                    : error}
                </p>
                <Button
                  variant="outline"
                  iconName="Download"
                  iconPosition="left"
                  onClick={() => onDownload(doc)}
                  className="mt-2 font-body"
                >
                  Télécharger pour consulter
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && url && (
            <object data={url} type="application/pdf" className="w-full h-96 bg-muted rounded-lg">
              <img src={url} alt={doc.title} className="max-w-full h-96 object-contain mx-auto" />
            </object>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
