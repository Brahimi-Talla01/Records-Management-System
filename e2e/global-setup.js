import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginAs, ACCOUNTS } from './fixtures.js';
import { ADMIN_STATE, PROF_STATE } from './auth-state.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

async function saveSession(browser, baseURL, account, statePath) {
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await loginAs(page, account);
  await context.storageState({ path: path.resolve(HERE, '..', statePath) });
  await context.close();
}

/**
 * Ouvre une session admin et une session prof, une seule fois, et enregistre
 * leurs cookies. Évite de consommer le quota de login (5/min par IP) sur chaque
 * test et garantit que le stack est joignable avant la campagne.
 */
export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL;
  fs.mkdirSync(path.join(HERE, '.auth'), { recursive: true });

  const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || 'chrome' });
  try {
    await saveSession(browser, baseURL, ACCOUNTS.admin, ADMIN_STATE);
    await saveSession(browser, baseURL, ACCOUNTS.prof, PROF_STATE);
  } finally {
    await browser.close();
  }
}
