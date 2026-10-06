import { describe, it, expect } from 'vitest';
import {
  parseLibraryParams,
  toSearchParams,
  toListQuery,
  countActiveFilters,
} from './urlState';

const parse = (search) => parseLibraryParams(new URLSearchParams(search));

describe("état URL de la bibliothèque (F3)", () => {
  it('valide les valeurs et ignore les saugrennes', () => {
    const state = parse(
      'q=th%C3%A8se&page=2&sort=title&order=asc&department_id=abc&status=deleted'
    );
    expect(state.q).toBe('thèse');
    expect(state.page).toBe(2);
    expect(state.sort).toBe('title');
    expect(state.order).toBe('asc');
    expect(state.department_id).toBeNull();
    expect(state.status).toBe('deleted');
  });

  it('rejette un tri hors liste et un statut inconnu', () => {
    const state = parse('sort=password&order=sideways&status=zzz');
    expect(state.sort).toBeNull();
    expect(state.order).toBeNull();
    expect(state.status).toBeNull();
  });

  it("interdit le tri size_bytes en pagination clé (400 serveur)", () => {
    expect(parse('pagination=keyset&sort=size_bytes').sort).toBeNull();
    expect(parse('pagination=keyset&sort=title').sort).toBe('title');
    expect(parse('sort=size_bytes').sort).toBe('size_bytes');
  });

  it("omise le curseur hors mode keyset", () => {
    expect(parse('cursor=abc&page=3').cursor).toBeNull();
    expect(parse('pagination=keyset&cursor=abc').cursor).toBe('abc');
  });

  it("un round-trip parse → toSearchParams préserve l'état", () => {
    const original = parse('q=rapport&department_id=3&sort=title&order=asc&page=4&status=deleted');
    const restored = parse(toSearchParams(original).toString());
    expect(restored).toEqual(original);
  });

  it('les valeurs par défaut ne salissent pas les URL', () => {
    const params = toSearchParams({ page: 1, sort: 'created_at', order: 'desc', status: 'active' });
    expect(params.toString()).toBe('');
  });

  it('toListQuery applique les défauts attendus par le backend', () => {
    expect(toListQuery({})).toEqual({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      status: 'active',
    });
    expect(toListQuery({ pagination: 'keyset', cursor: 'abc' })).toMatchObject({
      pagination: 'keyset',
      cursor: 'abc',
    });
    expect(toListQuery({ q: 'x' })).not.toHaveProperty('folder_id');
  });

  it("gère le mode d'affichage grille/lignes", () => {
    expect(parse('view=grid').view).toBe('grid');
    expect(parse('view=table').view).toBe('table');
    expect(parse('view=zzz').view).toBeNull();

    // Le défaut (`table`) ne salit pas l'URL ; `grid` y est conservé.
    expect(toSearchParams({ view: 'table' }).toString()).toBe('');
    expect(toSearchParams({ view: 'grid' }).toString()).toBe('view=grid');

    // L'affichage est un choix client : jamais envoyé à l'API.
    expect(toListQuery({ view: 'grid' })).not.toHaveProperty('view');
  });

  it("compte les filtres actifs hors dossier et hors tri", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters({ folder_id: 7, sort: 'title' })).toBe(0);
    expect(countActiveFilters({ q: 'a', department_id: 2, confidentiality: 'secret' })).toBe(3);
  });
});
