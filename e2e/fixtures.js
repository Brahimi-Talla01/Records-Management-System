import { test as base, expect } from '@playwright/test';
import { latestTwoFactorCode } from './helpers/db.js';

/**
 * Comptes de jeu de test (bootstrap backend : variables ADMIN_* + seeds démo).
 * Aucun compte réel de production n'est utilisé ; les défauts correspondent au
 * bootstrap par défaut (ADMIN_* en .env.example) et aux comptes de démo.
 */
export const ACCOUNTS = {
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || 'admin',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@2024',
  },
  prof: { username: process.env.E2E_PROF_USERNAME || 'prof', password: process.env.E2E_PROF_PASSWORD || 'Demo@2024' },
};

/**
 * Connexion complète : login (mot de passe) → 2FA (code lu en base) → dashboard.
 * Le backend impose le 2FA à chaque connexion (aucun SMTP en dev : le code est
 * en base / dans les logs).
 */
export async function loginAs(page, account = ACCOUNTS.admin) {
  await page.goto('/login');
  await page.getByLabel("Nom d'utilisateur ou email").fill(account.username);
  await page.getByLabel('Mot de passe').fill(account.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  const codeInput = page.getByLabel('Code de vérification');
  await codeInput.waitFor({ state: 'visible' });
  await codeInput.fill(latestTwoFactorCode(account.username));
  await page.getByRole('button', { name: 'Vérifier' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
}

/** Se déconnecte via le bouton du Header (révoque la session serveur). */
export async function logout(page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login/);
}

export const test = base;
export { expect };
