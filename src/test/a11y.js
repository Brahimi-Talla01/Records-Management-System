import { expect } from 'vitest';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';

// Matcher `toHaveNoViolations` disponible pour les tests qui importent ce helper.
expect.extend(matchers);

/**
 * Audit d'accessibilité (axe-core) d'un sous-arbre rendu, via `vitest-axe`.
 * Échoue si des violations WCAG détectables sont présentes.
 *
 * Deux règles sont désactivées par défaut, car non pertinentes pour un test de
 * sous-arbre (et pour ne pas laisser croire qu'elles sont couvertes) :
 * - `color-contrast` : non applicable sous jsdom (aucun calcul de couleurs) ;
 *   le contraste des tokens reste vérifié séparément (`src/styles/index.css`).
 * - `region` : règle de structure de **page** (tout contenu dans un landmark) ;
 *   elle n'a pas de sens pour un composant rendu hors page.
 * Passer `options.rules` pour les réactiver sur un test pleine page.
 */
export async function expectNoA11yViolations(container, options = {}) {
  const results = await axe(container, {
    ...options,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      ...(options.rules || {}),
    },
  });
  expect(results).toHaveNoViolations();
  return results;
}
