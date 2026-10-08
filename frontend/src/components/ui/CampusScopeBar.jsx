import Icon from '../AppIcon';
import { Badge } from './Badge';
import Select from './Select';

/**
 * Bandeau de périmètre multi-campus (A4).
 *
 * - un **super admin** voit un sélecteur (liste des campus, `Tous` inclus) ;
 * - les autres rôles voient leur périmètre en **lecture seule** (aucun filtre
 *   modifiable). Le filtrage réel reste serveur.
 */
const CampusScopeBar = ({
  campuses = [],
  campusId = null,
  onCampusChange,
  canSelect = false,
  scopeName,
}) => {
  const options = campuses.map((campus) => ({
    value: String(campus.campus_id),
    label: `${campus.name} (${campus.code})`,
  }));

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
        <Icon name="Building2" size={16} />
        <span>Périmètre :</span>
        {canSelect ? (
          <Select
            options={options}
            value={campusId ? String(campusId) : ''}
            onChange={(value) => onCampusChange?.(value ? Number(value) : null)}
            placeholder="Tous les campus"
            clearable
            className="w-64"
          />
        ) : (
          <Badge variant="outline">{scopeName || 'Mon campus'}</Badge>
        )}
      </div>
      {canSelect && campusId === null && (
        <span className="text-xs font-caption text-muted-foreground">Vue globale (tous campus)</span>
      )}
    </div>
  );
};

export default CampusScopeBar;
