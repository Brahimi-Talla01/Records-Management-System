/**
 * Résultats de recherche (F5.1/F5.3). L'extrait renvoyé par l'API est rendu
 * via `lib/sanitize` : les `<mark>` deviennent de vrais éléments React
 * (jamais `dangerouslySetInnerHTML`, A6).
 */
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { parseHighlightSegments } from '../../../lib/sanitize';
import {
  formatDateTime,
  formatFileSize,
  getDocumentStatusMeta,
  getConfidentialityMeta,
} from '../../../lib/formatters';

const ENGINE_LABELS = {
  postgres_fulltext: 'PostgreSQL plein texte',
  sql_ilike: 'Recherche simple',
};

function Snippet({ snippet }) {
  const segments = parseHighlightSegments(snippet);
  if (segments.length === 0) return null;
  return (
    <p className="mt-1 text-sm font-body text-muted-foreground line-clamp-2">
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={`mark-${index}-${segment.text}`}
            className="rounded bg-warning/30 px-0.5 text-foreground"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`text-${index}-${segment.text}`}>{segment.text}</span>
        )
      )}
    </p>
  );
}

const SearchResults = ({
  items = [],
  total = 0,
  page = 1,
  pages = 1,
  tookMs,
  engine,
  isLoading = false,
  isPaused = false,
  pauseMessage,
  docTypes = [],
  departments = [],
  onOpen,
  onPageChange,
}) => {
  const docTypeNames = new Map(docTypes.map((type) => [type.doc_type_id, type.name]));
  const departmentNames = new Map(
    departments.map((department) => [department.department_id, department.name])
  );

  if (isPaused) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card">
        <EmptyState
          icon="Clock"
          title="Recherche mise en pause"
          description={
            pauseMessage ||
            'Trop de requêtes envoyées. Patientez quelques instants avant de relancer la recherche.'
          }
        />
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-6 space-y-4">
        <Skeleton className="h-6 w-1/3" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 p-6 border-b border-border">
        <h2 className="text-xl font-heading font-semibold text-foreground">
          Résultats de recherche
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-body">
          <span>
            {total} document{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
          </span>
          {typeof tookMs === 'number' && <span>en {Math.round(tookMs)} ms</span>}
          {engine && <span>{ENGINE_LABELS[engine] || engine}</span>}
        </div>
      </div>

      <div className="p-6">
        {items.length === 0 ? (
          <EmptyState
            icon="Search"
            title="Aucun résultat"
            description="Essayez d'autres mots-clés ou retirez des filtres."
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((document) => {
              const status = getDocumentStatusMeta(document.status);
              const confidentiality = getConfidentialityMeta(document.confidentiality_level);
              return (
                <li key={document.document_id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-body font-medium text-foreground">{document.title}</h3>
                      <Badge variant={status.variant} className="font-caption">
                        {status.label}
                      </Badge>
                      <Badge variant={confidentiality.variant} className="font-caption">
                        {confidentiality.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-caption text-muted-foreground">
                      {docTypeNames.get(document.doc_type_id) || 'Type inconnu'} ·{' '}
                      {departmentNames.get(document.department_id) || 'Sans département'} ·{' '}
                      {formatDateTime(document.created_at)} · {formatFileSize(document.size_bytes)}
                    </p>
                    <Snippet snippet={document.snippet} />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ArrowRight"
                    iconPosition="right"
                    onClick={() => onOpen(document)}
                    className="font-body shrink-0"
                  >
                    Ouvrir
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground font-body">
              Page {page} sur {pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconName="ArrowLeft"
                iconPosition="left"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="font-body"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronRight"
                iconPosition="right"
                disabled={page >= pages}
                onClick={() => onPageChange(page + 1)}
                className="font-body"
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
