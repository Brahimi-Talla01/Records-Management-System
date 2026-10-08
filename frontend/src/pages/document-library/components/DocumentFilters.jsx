/**
 * Filtres de la bibliothèque (F3.2 + F3.7) : chaque contrôle écrit une clé de
 * l'URL, jamais un état local. Les listes viennent des référentiels API.
 */
import { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { getConfidentialityMeta } from '../../../lib/formatters';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actifs' },
  { value: 'archived', label: 'Archivés' },
  { value: 'deleted', label: 'Corbeille' },
];

const CONFIDENTIALITY_OPTIONS = [
  { value: '', label: 'Tous les niveaux' },
  ...['public', 'internal', 'confidential', 'secret'].map((level) => ({
    value: level,
    label: getConfidentialityMeta(level).label,
  })),
];

const DocumentFilters = ({
  filters = {},
  onChange = () => {},
  onClear = () => {},
  docTypes = [],
  departments = [],
  tags = [],
  resultsLabel = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const set = (key, value) => onChange({ [key]: value, page: 1 });

  const tagIds = String(filters.tag_ids || '')
    .split(',')
    .filter(Boolean)
    .map(Number);

  const hasActiveFilters = ['q', 'department_id', 'doc_type_id', 'confidentiality', 'tag_ids', 'created_from', 'created_to']
    .some((key) => filters[key] !== null && filters[key] !== undefined && filters[key] !== '');

  const toggleTag = (tagId) => {
    const next = tagIds.includes(tagId)
      ? tagIds.filter((id) => id !== tagId)
      : [...tagIds, tagId];
    set('tag_ids', next.join(','));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Input
            type="search"
            placeholder="Rechercher un titre, une description…"
            value={filters.q || ''}
            onChange={(event) => set('q', event.target.value)}
            className="sm:w-72"
            aria-label="Rechercher dans la bibliothèque"
          />
          <Select
            options={[
              { value: '', label: 'Tous les types' },
              ...docTypes.map((type) => ({
                value: type.doc_type_id,
                label: type.name,
              })),
            ]}
            value={filters.doc_type_id || ''}
            onChange={(value) => set('doc_type_id', value)}
            placeholder="Type de document"
            className="sm:w-48"
          />
          <Select
            options={[
              { value: '', label: 'Tous les départements' },
              ...departments.map((dept) => ({
                value: dept.department_id,
                label: dept.name,
              })),
            ]}
            value={filters.department_id || ''}
            onChange={(value) => set('department_id', value)}
            placeholder="Département"
            className="sm:w-48"
          />
          <Select
            options={STATUS_OPTIONS}
            value={filters.status || 'active'}
            onChange={(value) => set('status', value)}
            className="sm:w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            iconPosition="right"
            onClick={() => setIsExpanded((open) => !open)}
            className="font-body"
          >
            Filtres avancés
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              iconName="X"
              iconPosition="left"
              onClick={onClear}
              className="font-body text-muted-foreground"
            >
              Effacer
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Confidentialité"
            options={CONFIDENTIALITY_OPTIONS}
            value={filters.confidentiality || ''}
            onChange={(value) => set('confidentiality', value)}
          />
          <Input
            label="Créé à partir du"
            type="date"
            value={filters.created_from || ''}
            onChange={(event) => set('created_from', event.target.value)}
          />
          <Input
            label="Créé jusqu'au"
            type="date"
            value={filters.created_to || ''}
            onChange={(event) => set('created_to', event.target.value)}
          />

          <div className="md:col-span-2 lg:col-span-4">
            <p className="text-sm font-medium text-foreground mb-2">Étiquettes</p>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">
                Aucune étiquette disponible.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = tagIds.includes(tag.tag_id);
                  return (
                    <button
                      key={tag.tag_id}
                      type="button"
                      onClick={() => toggleTag(tag.tag_id)}
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : 'border-border bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {selected && <Icon name="Check" size={12} />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="FileText" size={16} className="text-muted-foreground" />
          <span className="font-body text-sm text-muted-foreground">{resultsLabel}</span>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Icon name="Filter" size={16} className="text-accent" />
            <span className="font-caption text-sm text-accent">Filtres actifs</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentFilters;
