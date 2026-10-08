import { describe, it, expect } from 'vitest';
import {
  parseUserParams,
  toUserSearchParams,
  toUsersFilters,
  countActiveFilters,
} from './urlState';

describe('état d’URL de l’écran utilisateurs (F6.5)', () => {
  it('parseUserParams normalise la page et ignore les is_active inconnus', () => {
    const params = new URLSearchParams('page=3&q=dupont&role_id=2&is_active=maybe');
    const view = parseUserParams(params);
    expect(view.page).toBe(3);
    expect(view.q).toBe('dupont');
    expect(view.role_id).toBe('2');
    expect(view.is_active).toBe('');
  });

  it('parseUserParams retombe sur la page 1 pour une valeur invalide', () => {
    expect(parseUserParams(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseUserParams(new URLSearchParams('page=abc')).page).toBe(1);
    expect(parseUserParams(new URLSearchParams()).page).toBe(1);
  });

  it('toUserSearchParams omet les valeurs par défaut', () => {
    expect([...toUserSearchParams({}).keys()]).toHaveLength(0);
    const params = toUserSearchParams({ page: 2, q: 'a', role_id: '1' });
    expect(params.get('page')).toBe('2');
    expect(params.get('q')).toBe('a');
    expect(params.get('role_id')).toBe('1');
  });

  it('toUsersFilters dérive les filtres serveur', () => {
    expect(
      toUsersFilters({ q: 'ab', role_id: '2', department_id: '', is_active: 'false' })
    ).toEqual({ search: 'ab', role_id: '2', department_id: undefined, is_active: 'false' });
  });

  it('countActiveFilters compte les filtres hors page', () => {
    expect(countActiveFilters({ page: 4 })).toBe(0);
    expect(countActiveFilters({ q: 'x', is_active: 'true' })).toBe(2);
  });
});
