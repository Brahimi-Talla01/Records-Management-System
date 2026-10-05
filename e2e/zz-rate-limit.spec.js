import { test, expect } from './fixtures.js';

/**
 * Rate limiting (429).
 *
 * ATTENTION : ce test consomme le quota de connexion (5/min par IP) pour tout le
 * run. Le fichier est préfixé `zz-` pour s'exécuter **en dernier** (Playwright
 * ordonne les fichiers alphabétiquement) et ne pas bloquer les autres scénarios.
 */
test.describe('Rate limiting', () => {
  test('429 après trop de tentatives de connexion', async ({ page }) => {
    test.slow();
    let status = 0;
    for (let attempt = 0; attempt < 10 && status !== 429; attempt += 1) {
      const res = await page.request.post('/api/auth/login', {
        data: { username: 'inconnu', password: 'mauvais-mot-de-passe' },
      });
      status = res.status();
    }
    expect(status).toBe(429);
  });
});
