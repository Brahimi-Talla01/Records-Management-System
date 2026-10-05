import { test, expect, loginAs, ACCOUNTS } from './fixtures.js';
import { EMPTY_STATE } from './auth-state.js';

test.describe('Fumée — session', () => {
  test('session admin restaurée : accès direct au tableau de bord', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
  });

  test.describe('flux de connexion complet (déconnecté)', () => {
    test.use({ storageState: EMPTY_STATE });

    test('login + 2FA → tableau de bord', async ({ page }) => {
      await loginAs(page, ACCOUNTS.admin);
      await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();
    });

    test('identifiants erronés : reste sur /login (pas de 2FA)', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel("Nom d'utilisateur ou email").fill(ACCOUNTS.admin.username);
      await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
      await page.getByRole('button', { name: 'Se connecter' }).click();

      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByLabel('Code de vérification')).toHaveCount(0);
    });
  });
});
