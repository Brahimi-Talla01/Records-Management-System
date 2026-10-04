import { describe, it, expect } from 'vitest';
import { parseHighlightSegments, hasHighlight } from './sanitize';

describe('lib/sanitize (F5.3)', () => {
  it('découpe un extrait surligné en segments ordonnés', () => {
    expect(parseHighlightSegments('Le <mark>rapport</mark> annuel')).toEqual([
      { text: 'Le ', highlight: false },
      { text: 'rapport', highlight: true },
      { text: ' annuel', highlight: false },
    ]);
  });

  it('renvoie un tableau vide pour un extrait absent', () => {
    expect(parseHighlightSegments('')).toEqual([]);
    expect(parseHighlightSegments(null)).toEqual([]);
    expect(parseHighlightSegments(undefined)).toEqual([]);
  });

  it('traite tout HTML non-<mark> comme du texte (jamais interprété)', () => {
    expect(parseHighlightSegments('<script>alert(1)</script><mark>ok</mark>')).toEqual([
      { text: '<script>alert(1)</script>', highlight: false },
      { text: 'ok', highlight: true },
    ]);
  });

  it('détecte la présence d’une mise en évidence', () => {
    expect(hasHighlight('a <mark>b</mark> c')).toBe(true);
    expect(hasHighlight('a b c')).toBe(false);
  });
});
