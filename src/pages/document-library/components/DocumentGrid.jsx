/**
 * Vue « grille » de la bibliothèque (F3.2) — alternative cartes à la vue
 * tableau. Mêmes données, mêmes actions (ouvrir, aperçu, corbeille/restaurer)
 * et même sélection multiple que `DocumentTable` ; le tri, qui vit dans les
 * en-têtes du tableau, est ici proposé par un sélecteur dédié.
 */
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  formatFileSize,
  formatDate,
  getDocumentStatusMeta,
  getConfidentialityMeta,
} from '../../../lib/formatters';

/** Réutilise les tris serveur supportés par la vue tableau. */
const SORT_OPTIONS = [
  { value: 'created_at:desc', label: "Date d'ajout (récent)" },
  { value: 'created_at:asc', label: "Date d'ajout (ancien)" },
  { value: 'updated_at:desc', label: 'Modifié le (récent)' },
  { value: 'updated_at:asc', label: 'Modifié le (ancien)' },
  { value: 'title:asc', label: 'Titre (A → Z)' },
  { value: 'title:desc', label: 'Titre (Z → A)' },
  { value: 'size_bytes:desc', label: 'Taille (décroissant)' },
  { value: 'size_bytes:asc', label: 'Taille (croissant)' },
];

const DocumentGrid = ({
  documents = [],
  isLoading = false,
  selected = [],
  onToggle,
  onToggleAll,
  onOpen,
  onPreview,
  onChangeSort,
  sort = 'created_at',
  order = 'desc',
  canEdit = false,
  canDelete = false,
  isDeletedView = false,
  onRestore,
  onDelete,
  emptyTitle = 'Aucun document',
  emptyDescription = 'Aucun document ne correspond aux critères de recherche.',
  emptyAction,
}) => {
  const allSelected = documents.length > 0 && documents.every((doc) => selected.includes(doc.document_id));
  const someSelected = documents.some((doc) => selected.includes(doc.document_id));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg">
        <EmptyState
          icon="FileX"
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils : tri (absent des en-têtes de tableau) + tout sélectionner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && someSelected}
            onChange={(event) => onToggleAll?.(event.target.checked)}
            size="sm"
            label="Tout sélectionner"
          />
        </div>
        <Select
          className="sm:w-64"
          options={SORT_OPTIONS}
          value={`${sort}:${order}`}
          onChange={(value) => {
            const [key, nextOrder] = String(value).split(':');
            onChangeSort?.(key, nextOrder);
          }}
          aria-label="Trier les documents"
        />
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {documents.map((document) => {
          const status = getDocumentStatusMeta(document.status);
          const confidentiality = getConfidentialityMeta(document.confidentiality_level);
          const isSelected = selected.includes(document.document_id);
          return (
            <li
              key={document.document_id}
              className={`bg-card border rounded-lg shadow-card transition-colors duration-200 flex flex-col ${
                isSelected ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Icon
                      name={document.is_encrypted ? 'Lock' : 'FileText'}
                      size={20}
                      className="text-muted-foreground"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-foreground truncate" title={document.title}>
                      {document.title}
                    </p>
                    {document.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {document.description}
                      </p>
                    )}
                  </div>
                </div>
                <Checkbox
                  checked={isSelected}
                  onChange={(event) => onToggle(document.document_id, event.target.checked)}
                  size="sm"
                  aria-label={`Sélectionner ${document.title}`}
                />
              </div>

              <div className="px-4 flex flex-wrap gap-2">
                <Badge variant={confidentiality.variant} className="font-caption">
                  {confidentiality.label}
                </Badge>
                <Badge variant={status.variant} className="font-caption">
                  {status.label}
                </Badge>
              </div>

              <div className="px-4 py-3 mt-auto flex flex-col gap-1 text-xs font-caption text-muted-foreground">
                <span>Ajouté le {formatDate(document.created_at)}</span>
                <span>{formatFileSize(document.size_bytes)}</span>
              </div>

              <div className="flex items-center justify-end gap-1 p-2 border-t border-border">
                <Button variant="ghost" size="sm" iconName="Eye" iconPosition="left" onClick={() => onOpen(document)}>
                  Ouvrir
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Aperçu"
                  aria-label={`Aperçu de ${document.title}`}
                  onClick={() => onPreview?.(document)}
                >
                  <Icon name="FileText" size={16} />
                </Button>
                {isDeletedView
                  ? canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Restaurer"
                        aria-label={`Restaurer ${document.title}`}
                        onClick={() => onRestore(document)}
                      >
                        <Icon name="RotateCcw" size={16} />
                      </Button>
                    )
                  : canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Mettre à la corbeille"
                        aria-label={`Mettre ${document.title} à la corbeille`}
                        onClick={() => onDelete(document)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DocumentGrid;
