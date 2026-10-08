/** Chemins des états d'authentification enregistrés par `global-setup.js`. */
export const ADMIN_STATE = 'e2e/.auth/admin.json';
export const PROF_STATE = 'e2e/.auth/prof.json';
/** État vide : force un test à repartir déconnecté. */
export const EMPTY_STATE = { cookies: [], origins: [] };
