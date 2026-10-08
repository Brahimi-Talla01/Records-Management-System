/**
 * État de recherche piloté par l'URL (F5.1).
 *
 * Une URL copiée rouvre exactement la même vue (mots-clés, filtres, page) et
 * le retour navigateur conserve la recherche. Aucune donnée serveur en
 * `useState` : seule la saisie en cours de frappe est locale (débounce).
 *
 * Paramètres : q, department_id, doc_type_id, tag_ids, confidentiality,
 * date_from, date_to, page, per_page.
 */

export const DEFAULT_PER_PAGE = 20;

const STRINGS = ['q', 'status', 'confidentiality', 'date_from', 'date_to'];
const INTEGERS = ['department_id', 'doc_type_id', 'page', 'per_page'];
/** Filtres comptés comme « critères actifs » (hors pagination). */
const CRITERIA_KEYS = [
  'q',
  'status',
  'department_id',
  'doc_type_id',
  'confidentiality',
  'date_from',
  'date_to',
];

function clean(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

/** `URLSearchParams` → objet d'état (valeurs invalides ignorées). */
export function parseSearchParams(searchParams) {
  const get = (key) => searchParams.get(key);
  const state = {};

  for (const key of STRINGS) state[key] = clean(get(key));
  for (const key of INTEGERS) {
    const raw = get(key);
    const parsed = raw === null || raw === '' ? null : Number(raw);
    state[key] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
  }

  const rawTags = get('tag_ids');
  state.tag_ids = rawTags
    ? rawTags
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : [];

  if (state.page !== null && state.page < 1) state.page = null;
  if (state.per_page !== null && state.per_page < 1) state.per_page = null;
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

  for (const key of STRINGS) set(key, state[key]);
  set('department_id', state.department_id);
  set('doc_type_id', state.doc_type_id);
  set('page', state.page, 1);
  set('per_page', state.per_page, DEFAULT_PER_PAGE);
  if (state.tag_ids?.length) params.set('tag_ids', state.tag_ids.join(','));
  return params;
}

/** L'état porte-t-il de quoi lancer une recherche ? (sinon : état d'accueil) */
export function hasSearchCriteria(state = {}) {
  if (state.tag_ids?.length) return true;
  return CRITERIA_KEYS.some((key) => clean(state[key]) !== null);
}

/** Nombre de filtres actifs (pastille « filtres »). */
export function countActiveFilters(state = {}) {
  const filterKeys = ['status', 'department_id', 'doc_type_id', 'confidentiality', 'date_from', 'date_to'];
  let count = filterKeys.filter((key) => clean(state[key]) !== null).length;
  if (state.tag_ids?.length) count += state.tag_ids.length;
  return count;
}
