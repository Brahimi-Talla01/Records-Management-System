import { test, expect } from './fixtures.js';
import { PROF_STATE } from './auth-state.js';

test.describe('Erreurs serveur', () => {
  test.describe('403 — rôle insuffisant (A7 : le serveur fait foi)', () => {
    test.use({ storageState: PROF_STATE });

    test('un non-admin ne peut pas ouvrir la gestion des utilisateurs', async ({ page }) => {
      await page.goto('/user-management');
      // Garde UI : redirection vers la page 403 dédiée.
      await expect(page).toHaveURL(/\/forbidden/);
      // Le serveur refuse aussi (pas seulement l'UI).
      const res = await page.request.get('/api/users');
      expect(res.status()).toBe(403);
    });
  });

  test('413 — corps au-delà de la limite Nginx', async ({ page }) => {
    test.slow();
    // Limite Nginx du proxy /api : `client_max_body_size 50m`.
    const huge = Buffer.alloc(51 * 1024 * 1024, 0x41);
    const res = await page.request.post('/api/documents', {
      multipart: {
        title: 'Trop volumineux',
        file: { name: 'trop-gros.pdf', mimeType: 'application/pdf', buffer: huge },
      },
    });
    expect(res.status()).toBe(413);
  });
});
