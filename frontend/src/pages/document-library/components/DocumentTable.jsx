/**
 * Tableau des documents (F3.2) : champs réels de `document.to_dict()`,
 * tri délégué au serveur (les colonnes sont les tris supportés), sélection
 * multiple pour les actions groupées.
 */
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
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

/** Colonnes triables : `title`, `created_at`, `updated_at`, `size_bytes`. */
const COLUMNS = [
  { key: 'title', label: 'Titre' },
  { key: 'created_at', label: "Date d'ajout" },
  { key: 'updated_at', label: 'Modifié le' },
  { key: 'size_bytes', label: 'Taille' },
];

const DocumentTable = ({
  documents = [],
  isLoading = false,
  selected = [],
  onToggle,
  onToggleAll,
  onOpen,
  onPreview,
  onSort,
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

  const sortIcon = (key) => {
    if (sort !== key) return 'ArrowUpDown';
    return order === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Liste des documents de la bibliothèque</caption>
          <thead className="bg-muted border-b border-border">
            <tr>
              <th scope="col" className="w-12 p-3">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onChange={(event) => onToggleAll(event.target.checked)}
                  size="sm"
                  aria-label="Tout sélectionner"
                />
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort === column.key
                      ? order === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="text-left p-3 font-heading font-medium text-sm text-foreground"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSort(column.key)}
                    className="font-heading font-medium text-sm -ml-2"
                    title={`Trier par ${column.label.toLowerCase()}`}
                  >
                    {column.label}
                    <Icon name={sortIcon(column.key)} size={14} className="ml-1" />
                  </Button>
                </th>
              ))}
              <th scope="col" className="text-left p-3 font-heading font-medium text-sm text-foreground">
                Confidentialité
              </th>
              <th scope="col" className="text-left p-3 font-heading font-medium text-sm text-foreground">
                Statut
              </th>
              <th scope="col" className="text-center p-3 font-heading font-medium text-sm text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document, index) => {
              const status = getDocumentStatusMeta(document.status);
              const confidentiality = getConfidentialityMeta(document.confidentiality_level);
              const isSelected = selected.includes(document.document_id);
              return (
                <tr
                  key={document.document_id}
                  className={`border-b border-border hover:bg-muted/50 transition-colors duration-200 cursor-pointer ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  } ${isSelected ? 'bg-primary/5' : ''}`}
                  onClick={() => onOpen(document)}
                >
                  <td className="p-3" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) => onToggle(document.document_id, event.target.checked)}
                      size="sm"
                      aria-label={`Sélectionner ${document.title}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Icon name={document.is_encrypted ? 'Lock' : 'FileText'} size={16} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm text-foreground truncate" title={document.title}>
                          {document.title}
                        </p>
                        {document.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {document.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-caption text-sm text-muted-foreground">
                    {formatDate(document.created_at)}
                  </td>
                  <td className="p-3 font-caption text-sm text-muted-foreground">
                    {formatDate(document.updated_at)}
                  </td>
                  <td className="p-3 font-caption text-sm text-muted-foreground">
                    {formatFileSize(document.size_bytes)}
                  </td>
                  <td className="p-3">
                    <Badge variant={confidentiality.variant} className="font-caption">
                      {confidentiality.label}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={status.variant} className="font-caption">
                      {status.label}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div
                      className="flex items-center justify-center gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ouvrir la fiche"
                        onClick={() => onOpen(document)}
                      >
                        <Icon name="Eye" size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Aperçu"
                        onClick={() => onPreview?.(document)}
                      >
                        <Icon name="FileText" size={16} />
                      </Button>
                      {isDeletedView ? (
                        canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Restaurer"
                            onClick={() => onRestore(document)}
                          >
                            <Icon name="RotateCcw" size={16} />
                          </Button>
                        )
                      ) : (
                        canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mettre à la corbeille"
                            onClick={() => onDelete(document)}
                          >
                            <Icon name="Trash2" size={16} />
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentTable;
