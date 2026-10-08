/**
 * Filtres à facettes (F5.2). Les compteurs viennent de `GET /search` (champ
 * `facets`) et chaque entrée bascule un paramètre d'URL — aucun filtrage
 * côté client.
 */
import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { getConfidentialityMeta } from '../../../lib/formatters';

const STATUS_LABELS = { active: 'Actifs', archived: 'Archivés', deleted: 'Corbeille' };

const FacetRow = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-body transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
    }`}
  >
    <span className="truncate">{label}</span>
    <span className="ml-2 shrink-0 text-xs font-caption text-muted-foreground">{count}</span>
  </button>
);

const SearchFilters = ({ facets = {}, state = {}, onPatch, onClear, resultCount = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const docTypes = facets.doc_types || [];
  const departments = facets.departments || [];
  const statuses = facets.statuses || [];
  const confidentialities = facets.confidentialities || [];

  const activeCount =
    (state.status ? 1 : 0) +
    (state.department_id ? 1 : 0) +
    (state.doc_type_id ? 1 : 0) +
    (state.confidentiality ? 1 : 0) +
    (state.tag_ids?.length || 0);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="flex items-center space-x-3 text-left"
        >
          <Icon name="Filter" size={20} className="text-primary" />
          <div>
            <h3 className="font-heading font-medium text-foreground">Filtres</h3>
            <p className="text-sm text-muted-foreground font-body">
              {resultCount} résultat{resultCount > 1 ? 's' : ''}
              {activeCount > 0 && ` · ${activeCount} actif${activeCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </button>
        <div className="flex items-center space-x-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" iconName="X" onClick={onClear} className="font-body">
              Effacer
            </Button>
          )}
          <button type="button" onClick={() => setIsExpanded((value) => !value)} aria-label="Replier">
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {statuses.length > 0 && (
            <section>
              <h4 className="mb-2 font-body font-medium text-foreground">Statut</h4>
              <div className="space-y-1">
                {statuses.map((facet) => (
                  <FacetRow
                    key={facet.value}
                    label={STATUS_LABELS[facet.value] || facet.value}
                    count={facet.count}
                    active={state.status === facet.value}
                    onClick={() =>
                      onPatch({ status: state.status === facet.value ? null : facet.value, page: 1 })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {docTypes.length > 0 && (
            <section>
              <h4 className="mb-2 font-body font-medium text-foreground">Type de document</h4>
              <div className="space-y-1">
                {docTypes.map((facet) => (
                  <FacetRow
                    key={facet.id}
                    label={facet.label || `Type #${facet.id}`}
                    count={facet.count}
                    active={state.doc_type_id === facet.id}
                    onClick={() =>
                      onPatch({
                        doc_type_id: state.doc_type_id === facet.id ? null : facet.id,
                        page: 1,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {departments.length > 0 && (
            <section>
              <h4 className="mb-2 font-body font-medium text-foreground">Département</h4>
              <div className="space-y-1">
                {departments.map((facet) => (
                  <FacetRow
                    key={facet.id}
                    label={facet.label || `Département #${facet.id}`}
                    count={facet.count}
                    active={state.department_id === facet.id}
                    onClick={() =>
                      onPatch({
                        department_id: state.department_id === facet.id ? null : facet.id,
                        page: 1,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {confidentialities.length > 0 && (
            <section>
              <h4 className="mb-2 font-body font-medium text-foreground">Confidentialité</h4>
              <div className="space-y-1">
                {confidentialities.map((facet) => (
                  <FacetRow
                    key={facet.value}
                    label={getConfidentialityMeta(facet.value).label}
                    count={facet.count}
                    active={state.confidentiality === facet.value}
                    onClick={() =>
                      onPatch({
                        confidentiality:
                          state.confidentiality === facet.value ? null : facet.value,
                        page: 1,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {docTypes.length + departments.length + statuses.length + confidentialities.length === 0 && (
            <p className="text-sm text-muted-foreground font-body">Aucune facette disponible.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
