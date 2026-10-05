import { test, expect } from './fixtures.js';

/** Ouvre le menu « Administration » (Q9) puis l'entrée demandée. */
async function openAdmin(page, item) {
  await page.getByRole('button', { name: 'Administration' }).click();
  await page.getByRole('button', { name: item, exact: true }).click();
}

test.describe('Parcours administrateur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Administration' })).toBeVisible();
  });

  test('utilisateurs : liste paginée servie par l\'API', async ({ page }) => {
    await openAdmin(page, 'Utilisateurs');
    await expect(page).toHaveURL(/\/user-management/);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('référentiels : écran à onglets', async ({ page }) => {
    await openAdmin(page, 'Référentiels');
    await expect(page).toHaveURL(/\/referentials/);
  });

  test('audit : journal filtrable', async ({ page }) => {
    await openAdmin(page, 'Audit');
    await expect(page).toHaveURL(/\/audit/);
  });

  test('campus : visible pour un super admin', async ({ page }) => {
    await openAdmin(page, 'Campus');
    await expect(page).toHaveURL(/\/campuses/);
  });

  test('rétention : écran super admin', async ({ page }) => {
    await openAdmin(page, 'Rétention');
    await expect(page).toHaveURL(/\/retention/);
  });
});
