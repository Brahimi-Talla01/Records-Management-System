/**
 * Historique des recherches (F5.4) : `GET /search/history` (dédupliqué côté
 * serveur), réutilisation d'une requête passée, vidage avec confirmation.
 */
import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../components/ui/useToast';
import { useConfirm } from '../../../components/ui/useConfirm';
import { useSearchHistory, useClearSearchHistory } from '../../../features/search';
import { toAppError } from '../../../lib/errors';
import { formatRelativeTime } from '../../../lib/formatters';

const SearchHistory = ({ onReuse }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const historyQuery = useSearchHistory({ per_page: 10 }, { enabled: isExpanded });
  const clearHistory = useClearSearchHistory();

  const items = historyQuery.data?.items || [];

  const handleClear = async () => {
    const ok = await confirm({
      title: "Vider l'historique",
      description: 'Toutes vos recherches enregistrées seront supprimées.',
      confirmLabel: 'Vider',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await clearHistory.mutateAsync();
      toast.success('Historique vidé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="flex items-center space-x-3 text-left"
        >
          <Icon name="History" size={20} className="text-primary" />
          <h3 className="font-heading font-medium text-foreground">Historique</h3>
        </button>
        <div className="flex items-center space-x-2">
          {isExpanded && items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              iconName="Trash2"
              onClick={handleClear}
              loading={clearHistory.isPending}
              className="font-body"
            >
              Vider
            </Button>
          )}
          <button type="button" onClick={() => setIsExpanded((value) => !value)} aria-label="Replier">
            <Icon
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
              size={20}
              className="text-muted-foreground"
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4">
          {historyQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="History"
              title="Aucune recherche"
              description="Vos recherches apparaîtront ici pour être relancées en un clic."
            />
          ) : (
            <ul className="space-y-2">
              {items.map((entry) => (
                <li key={entry.search_id}>
                  <button
                    type="button"
                    onClick={() => onReuse(entry)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-muted transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-body text-sm text-foreground">
                        {entry.query || '(sans mot-clé)'}
                      </span>
                      <span className="font-caption text-xs text-muted-foreground">
                        {entry.results_count ?? 0} résultat(s) ·{' '}
                        {formatRelativeTime(entry.searched_at)}
                      </span>
                    </span>
                    <Icon name="RotateCcw" size={16} className="ml-2 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
