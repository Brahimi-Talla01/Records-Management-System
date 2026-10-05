import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate, getDocumentStatusMeta } from '../../../lib/formatters';

/**
 * Échéances de rétention à venir (préavis J-30) issues de
 * `GET /dashboard/expiring`. Une échéance dépassée est signalée `overdue`.
 */
const ExpiringDocuments = ({ documents = [], days = 30, isLoading = false }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-warning rounded-lg flex items-center justify-center">
            <Icon name="AlertTriangle" size={18} className="text-warning-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Échéances de rétention</h2>
            <p className="text-sm text-muted-foreground font-body">
              Documents dont la conservation expire d'ici {days} jours
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon="CheckCircle2"
          iconClassName="text-success"
          title="Aucune échéance proche"
          description={`Aucune conservation n'expire dans les ${days} prochains jours.`}
        />
      ) : (
        <div className="p-6 space-y-3">
          {documents.slice(0, 6).map((document) => {
            const status = getDocumentStatusMeta(document?.status);
            return (
              <div
                key={document?.document_id}
                className="flex items-center justify-between gap-3 p-3 hover:bg-muted rounded-lg transition-colors duration-200"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-body font-medium text-foreground truncate">
                    {document?.title}
                  </h4>
                  <p className="text-xs text-muted-foreground font-caption mt-0.5">
                    Expire le {formatDate(document?.retention_expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {document?.overdue && <Badge variant="error">Dépassée</Badge>}
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            fullWidth
            iconName="ExternalLink"
            iconPosition="right"
            iconSize={14}
            onClick={() => navigate('/document-library')}
            className="font-body"
          >
            Gérer la rétention
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExpiringDocuments;
