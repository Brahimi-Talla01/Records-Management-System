/**
 * Formulaire de recherche (F5.1). Tous les champs alimentent l'URL via
 * `onPatch` ; le champ mots-clés est débouncé côté page (300 ms). Les listes
 * viennent de l'API (types, départements, tags).
 */
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { getConfidentialityMeta } from '../../../lib/formatters';

const CONFIDENTIALITY_ORDER = ['public', 'internal', 'confidential', 'secret'];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Actifs' },
  { value: 'archived', label: 'Archivés' },
  { value: 'deleted', label: 'Corbeille' },
];

const SearchForm = ({
  state = {},
  keyword = '',
  onKeywordChange,
  onPatch,
  onClear,
  docTypes = [],
  departments = [],
  tags = [],
  isLoading = false,
}) => {
  const docTypeOptions = docTypes.map((type) => ({
    value: String(type.doc_type_id),
    label: type.name,
  }));
  const departmentOptions = departments.map((department) => ({
    value: String(department.department_id),
    label: department.name,
  }));
  const tagOptions = tags.map((tag) => ({ value: String(tag.tag_id), label: tag.name }));
  const confidentialityOptions = CONFIDENTIALITY_ORDER.map((level) => ({
    value: level,
    label: getConfidentialityMeta(level).label,
  }));

  const numberOrNull = (value) => (value === '' || value === undefined ? null : Number(value));

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-heading font-semibold text-foreground flex items-center space-x-2">
          <Icon name="Search" size={24} />
          <span>Recherche avancée</span>
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Affinez votre recherche par mots-clés et filtres
        </p>
      </div>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="p-6 space-y-6"
      >
        <Input
          label="Recherche textuelle"
          type="text"
          placeholder="Titre, description, contenu…"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          description="Recherche dans le titre, le contenu et les métadonnées"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Type de document"
            options={docTypeOptions}
            value={state.doc_type_id ? String(state.doc_type_id) : ''}
            onChange={(value) => onPatch({ doc_type_id: numberOrNull(value), page: 1 })}
            placeholder="Tous les types"
            searchable
            clearable
          />
          <Select
            label="Département"
            options={departmentOptions}
            value={state.department_id ? String(state.department_id) : ''}
            onChange={(value) => onPatch({ department_id: numberOrNull(value), page: 1 })}
            placeholder="Tous les départements"
            searchable
            clearable
          />
          <Select
            label="Étiquettes"
            options={tagOptions}
            value={(state.tag_ids || []).map(String)}
            onChange={(values) => onPatch({ tag_ids: (values || []).map(Number), page: 1 })}
            placeholder="Toutes les étiquettes"
            multiple
            searchable
            clearable
          />
          <Select
            label="Niveau de confidentialité"
            options={confidentialityOptions}
            value={state.confidentiality || ''}
            onChange={(value) => onPatch({ confidentiality: value || null, page: 1 })}
            placeholder="Tous les niveaux"
            clearable
          />
          <Select
            label="Statut"
            options={STATUS_OPTIONS}
            value={state.status || ''}
            onChange={(value) => onPatch({ status: value || null, page: 1 })}
            placeholder="Actifs (par défaut)"
            clearable
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Input
            label="Créés à partir du"
            type="date"
            value={state.date_from || ''}
            onChange={(event) => onPatch({ date_from: event.target.value || null, page: 1 })}
          />
          <Input
            label="Créés jusqu’au"
            type="date"
            value={state.date_to || ''}
            onChange={(event) => onPatch({ date_to: event.target.value || null, page: 1 })}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            iconName="RotateCcw"
            iconPosition="left"
            iconSize={16}
            onClick={onClear}
            className="font-body"
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            variant="default"
            iconName="Search"
            iconPosition="left"
            iconSize={16}
            loading={isLoading}
            className="font-body"
          >
            Rechercher
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
