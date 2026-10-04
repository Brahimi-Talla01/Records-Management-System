/**
 * État d'URL de l'écran utilisateurs (F6.5) — même principe que la
 * bibliothèque (F3) et la recherche (F5) : l'URL est la source unique de
 * vérité, une URL copiée rouvre la même liste filtrée.
 */

/** Valeurs acceptées par l'API (miroir de `_parse_filters` backend). */
const ACTIVE_VALUES = new Set(['true', 'false']);

/** `URLSearchParams` → vue (types et bornes normalisés). */
export function parseUserParams(searchParams) {
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  return {
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    q: searchParams.get('q') || '',
    role_id: searchParams.get('role_id') || '',
    department_id: searchParams.get('department_id') || '',
    is_active: ACTIVE_VALUES.has(searchParams.get('is_active'))
      ? searchParams.get('is_active')
      : '',
  };
}

/** Vue → `URLSearchParams` (les valeurs par défaut sont omises). */
export function toUserSearchParams(view = {}) {
  const params = new URLSearchParams();
  if ((view.page ?? 1) > 1) params.set('page', String(view.page));
  if (view.q) params.set('q', view.q);
  if (view.role_id) params.set('role_id', String(view.role_id));
  if (view.department_id) params.set('department_id', String(view.department_id));
  if (view.is_active) params.set('is_active', view.is_active);
  return params;
}

/** Filtres API dérivés de la vue (pas de `page` : c'est un paramètre séparé). */
export function toUsersFilters(view = {}) {
  return {
    search: view.q || undefined,
    role_id: view.role_id || undefined,
    department_id: view.department_id || undefined,
    is_active: view.is_active || undefined,
  };
}

/** Nombre de filtres actifs (hors page) pour l'État « Effacer ». */
export function countActiveFilters(view = {}) {
  return [view.q, view.role_id, view.department_id, view.is_active].filter(
    Boolean
  ).length;
}
