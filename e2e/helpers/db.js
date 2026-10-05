import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Accès minimal à la base de la stack Docker, pour lire le code 2FA.
 * Le backend logge aussi le code en dev (`docker compose logs backend`) et,
 * sans SMTP configuré, c'est le seul moyen de se connecter : on lit donc la
 * table `two_factor_code` directement, comme le fait le script e2e backend.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../../..'); // frontend/e2e/helpers → racine du dépôt
const COMPOSE_FILE =
  process.env.E2E_COMPOSE_FILE || path.join(REPO_ROOT, 'docker-compose.yml');

const PG_USER = process.env.POSTGRES_USER || 'uniarchive';
const PG_DB = process.env.POSTGRES_DB || 'uniarchive';
const DB_SERVICE = process.env.E2E_DB_SERVICE || 'db';

function psql(sql) {
  return execFileSync(
    'docker',
    [
      'compose',
      '-f',
      COMPOSE_FILE,
      'exec',
      '-T',
      DB_SERVICE,
      'psql',
      '-U',
      PG_USER,
      '-d',
      PG_DB,
      '-tAc',
      sql,
    ],
    { encoding: 'utf8' }
  ).trim();
}

/** Dernier code 2FA non vérifié du compte `username`. */
export function latestTwoFactorCode(username) {
  const sql =
    "SELECT t.code FROM two_factor_code t " +
    'JOIN user_account u ON u.user_id = t.user_id ' +
    `WHERE u.username = '${username}' AND t.verified = false ` +
    'ORDER BY t.created_at DESC LIMIT 1';
  const code = psql(sql);
  if (!/^\d{6}$/.test(code)) {
    throw new Error(`Code 2FA introuvable pour « ${username} » (reçu : « ${code} »)`);
  }
  return code;
}
