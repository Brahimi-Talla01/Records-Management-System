/**
 * État de la liste « bibliothèque » piloté par l'URL (F3.2).
 *
 * Une URL copiée rouvre exactement la même vue, le bouton « retour » conserve
 * les filtres, et la page ne garde aucune copie de ces valeurs en useState.
 *
 * Paramètres : q, folder_id, department_id, doc_type_id, status, confidentiality,
 * tag_ids, created_from, created_to, sort, order, page, per_page, pagination,
 * cursor, view (`table` par défaut, `grid` pour l'affichage en cartes).
 */

export const DEFAULT_SORT = 'created_at';
export const DEFAULT_ORDER = 'desc';
export const DEFAULT_PER_PAGE = 20;
export const SORTABLE = ['created_at', 'updated_at', 'title', 'size_bytes'];
/** Tris supportés par la pagination clé (colonnes NOT NULL, backend). */
export const KEYSET_SORTS = ['created_at', 'updated_at', 'title'];

const STRINGS = ['q', 'status', 'confidentiality', 'created_from', 'created_to', 'pagination', 'cursor', 'view'];
/** Modes d'affichage de la liste (affichage pur, jamais envoyé à l'API). */
export const VIEW_MODES = ['table', 'grid'];
export const DEFAULT_VIEW = 'table';
const INTEGERS = ['folder_id', 'department_id', 'doc_type_id', 'page', 'per_page'];
const SELECTS = ['sort', 'order'];

/** Lisibilité : ''/null/undefined → valeur absente. */
function clean(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

/** `URLSearchParams` → objet d'état typé (valeurs invalides ignorées). */
export function parseLibraryParams(searchParams) {
  const get = (key) => searchParams.get(key);
  const state = { tag_ids: get('tag_ids') || '' };

  for (const key of STRINGS) state[key] = clean(get(key));
  for (const key of INTEGERS) {
    const raw = get(key);
    const parsed = raw === null || raw === '' ? null : Number(raw);
    state[key] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  }
  for (const key of SELECTS) {
    const raw = get(key);
    state[key] = raw || null;
  }

  if (state.sort && !SORTABLE.includes(state.sort)) state.sort = null;
  if (state.order && !['asc', 'desc'].includes(state.order)) state.order = null;
  if (state.view && !VIEW_MODES.includes(state.view)) state.view = null;
  if (state.status && !['active', 'archived', 'deleted'].includes(state.status)) state.status = null;
  if (state.page !== null && state.page < 1) state.page = null;
  if (state.per_page !== null && state.per_page < 1) state.per_page = null;
  // La clé-pagination n'accepte que certains tris (400 cursor_unsupported_sort).
  if (state.pagination === 'keyset' && state.sort && !KEYSET_SORTS.includes(state.sort)) {
    state.sort = null;
  }
  if (state.pagination !== 'keyset') state.cursor = null;
  return state;
}

/** Objet d'état → `URLSearchParams` (les valeurs par défaut sont omises). */
export function toSearchParams(state = {}) {
  const params = new URLSearchParams();
  const set = (key, value, defaultValue) => {
    const cleaned = clean(value);
    if (cleaned === null || cleaned === defaultValue) return;
    params.set(key, String(cleaned));
  };

  // Clés portant une valeur par défaut : traitées ensuite, avec leur défaut.
  const withDefault = new Set(['page', 'per_page', 'sort', 'order', 'status', 'view']);
  for (const key of [...STRINGS, ...INTEGERS, ...SELECTS]) {
    if (withDefault.has(key)) continue;
    set(key, state[key]);
  }
  set('tag_ids', state.tag_ids);
  set('page', state.page, 1);
  set('per_page', state.per_page, DEFAULT_PER_PAGE);
  set('sort', state.sort, DEFAULT_SORT);
  set('order', state.order, DEFAULT_ORDER);
  set('status', state.status, 'active');
  set('view', state.view, DEFAULT_VIEW);
  return params;
}

/** État normalisé → paramètres d'entier côté API (`useDocuments`). */
export function toListQuery(state = {}) {
  const query = {
    ...state,
    page: state.page || 1,
    per_page: state.per_page || DEFAULT_PER_PAGE,
    sort: state.sort || DEFAULT_SORT,
    order: state.order || DEFAULT_ORDER,
    status: state.status || 'active',
  };
  for (const key of [...STRINGS, ...INTEGERS]) {
    if (query[key] === null || query[key] === undefined || query[key] === '') delete query[key];
  }
  if (query.pagination !== 'keyset') delete query.cursor;
  // `view` est un choix d'affichage : jamais transmis au serveur.
  delete query.view;
  return query;
}

/** Nombre de filtres réellement actifs (pastille « Filtres actifs »). */
export function countActiveFilters(state = {}) {
  const keys = [
    'q',
    'department_id',
    'doc_type_id',
    'confidentiality',
    'tag_ids',
    'created_from',
    'created_to',
  ];
  return keys.filter((key) => clean(state[key]) !== null).length;
}
