import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  formatFileSize,
  formatRelativeTime,
  getDocumentStatusMeta,
  getConfidentialityMeta,
} from '../../../lib/formatters';

/**
 * Documents récents issus de `GET /dashboard/recent-documents`.
 * Les liens renvoient vers la bibliothèque (le filtrage par document arrivera
 * en F3) ; aucune vignette factice n'est affichée.
 */
const RecentDocuments = ({ documents = [], isLoading = false }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-success rounded-lg flex items-center justify-center">
              <Icon name="FileText" size={18} className="text-success-foreground" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Documents récents</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="ExternalLink"
            iconPosition="right"
            iconSize={14}
            onClick={() => navigate('/document-library')}
            className="text-muted-foreground hover:text-foreground font-body"
          >
            Voir tout
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon="FileText"
          title="Aucun document récent"
          description="Déposez un premier document pour le voir apparaître ici."
          action={
            <Button
              variant="default"
              iconName="Upload"
              iconPosition="left"
              iconSize={16}
              onClick={() => navigate('/document-upload')}
              className="font-body"
            >
              Déposer un document
            </Button>
          }
        />
      ) : (
        <div className="p-6 space-y-3">
          {documents.slice(0, 6).map((document) => {
            const status = getDocumentStatusMeta(document?.status);
            const confidentiality = getConfidentialityMeta(document?.confidentiality_level);
            return (
              <button
                type="button"
                key={document?.document_id}
                onClick={() => navigate('/document-library')}
                className="w-full text-left flex items-center space-x-4 p-3 hover:bg-muted rounded-lg transition-colors duration-200"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Icon name="FileText" size={20} className="text-muted-foreground" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h4 className="text-sm font-body font-medium text-foreground truncate">
                      {document?.title}
                    </h4>
                    <Badge variant={status.variant} className="font-caption flex-shrink-0">
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-caption">
                    <span>{formatFileSize(document?.size_bytes)}</span>
                    <span>•</span>
                    <span>{formatRelativeTime(document?.created_at)}</span>
                    <Badge variant={confidentiality.variant} className="font-caption">
                      {confidentiality.label}
                    </Badge>
                    {document?.is_encrypted && (
                      <span className="inline-flex items-center gap-1">
                        <Icon name="Lock" size={12} />
                        Chiffré
                      </span>
                    )}
                  </div>
                </div>

                <Icon name="ChevronRight" size={18} className="text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentDocuments;
