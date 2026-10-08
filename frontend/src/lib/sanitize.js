/**
 * Rendu sûr des extraits de recherche (A6, F5.3).
 *
 * Le backend renvoie un extrait contenant uniquement les balises `<mark>`
 * (`StartSel=<mark>, StopSel=</mark>`). On ne fait **jamais** confiance à ce
 * HTML : on le découpe en segments `{ text, highlight }` que le composant rend
 * en éléments React (jamais `dangerouslySetInnerHTML`). Tout ce qui n'est pas
 * une paire `<mark>…</mark>` est renvoyé tel quel et rendu comme texte — donc
 * échappé par React, jamais interprété.
 */

const MARK_PATTERN = /<mark>([\s\S]*?)<\/mark>/gi;

/** Découpe un extrait surligné en segments ordonnés. */
export function parseHighlightSegments(snippet) {
  if (!snippet) return [];
  const segments = [];
  let lastIndex = 0;
  let match;
  MARK_PATTERN.lastIndex = 0;
  while ((match = MARK_PATTERN.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: snippet.slice(lastIndex, match.index), highlight: false });
    }
    segments.push({ text: match[1], highlight: true });
    lastIndex = MARK_PATTERN.lastIndex;
  }
  if (lastIndex < snippet.length) {
    segments.push({ text: snippet.slice(lastIndex), highlight: false });
  }
  return segments.filter((segment) => segment.text !== '');
}

/** L'extrait contient-il au moins une correspondance mise en évidence ? */
export function hasHighlight(snippet) {
  return parseHighlightSegments(snippet).some((segment) => segment.highlight);
}
