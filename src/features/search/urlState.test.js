import { describe, it, expect } from 'vitest';
import {
  parseSearchParams,
  toSearchParams,
  hasSearchCriteria,
  countActiveFilters,
} from './urlState';

const parse = (search) => parseSearchParams(new URLSearchParams(search));

describe('état URL de la recherche (F5)', () => {
  it('lit et valide les paramètres (valeurs invalides ignorées)', () => {
    const state = parse(
      'q=rapport&status=archived&department_id=2&tag_ids=1,3&page=2&doc_type_id=abc'
    );
    expect(state.q).toBe('rapport');
    expect(state.status).toBe('archived');
    expect(state.department_id).toBe(2);
    expect(state.tag_ids).toEqual([1, 3]);
    expect(state.page).toBe(2);
    expect(state.doc_type_id).toBeNull();
  });

  it('un round-trip parse → toSearchParams préserve l’état', () => {
    const original = parse('q=thèse&department_id=3&confidentiality=secret&tag_ids=2,5&page=4');
    expect(parse(toSearchParams(original).toString())).toEqual(original);
  });

  it('les valeurs par défaut ne salissent pas les URL', () => {
    expect(toSearchParams({ page: 1, per_page: 20 }).toString()).toBe('');
  });

  it('hasSearchCriteria détecte les critères', () => {
    expect(hasSearchCriteria(parse(''))).toBe(false);
    expect(hasSearchCriteria(parse('q=x'))).toBe(true);
    expect(hasSearchCriteria(parse('tag_ids=2'))).toBe(true);
  });

  it('countActiveFilters compte les filtres (hors q)', () => {
    expect(countActiveFilters(parse('q=x'))).toBe(0);
    expect(countActiveFilters(parse('q=x&department_id=1&tag_ids=2,3'))).toBe(3);
  });
});
