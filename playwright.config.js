import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright (F7 — campagne e2e étendue).
 *
 * L'application est servie par la stack Docker (`docker compose up -d --build`,
 * frontend Nginx sur http://localhost:8080, proxy /api → backend). Il n'y a
 * **pas** de `webServer` : les tests visent le stack réel. Surchargez l'URL via
 * `E2E_BASE_URL`.
 *
 * Exécution séquentielle (`workers: 1`) : les scénarios partagent l'état serveur
 * (rate limiting par IP, codes 2FA) et ne sont pas isolés entre eux.
 *
 * `globalSetup` ouvre **une seule fois** une session admin et une session prof
 * (le login est limité à 5/min par IP) et enregistre les cookies ; les projets
 * les réutilisent par défaut (`storageState`).
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Navigateur : Chrome système par défaut (`E2E_CHANNEL=chromium` pour le
    // navigateur embarqué, une fois `npx playwright install` terminé).
    channel: process.env.E2E_CHANNEL || 'chrome',
    storageState: 'e2e/.auth/admin.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
