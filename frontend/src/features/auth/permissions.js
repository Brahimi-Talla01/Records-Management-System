/**
 * Prédicats d'autorisation côté interface (confort uniquement).
 *
 * Définition serveur (app/scope.py) : un **super admin** est un `Admin`
 * dont `campus_id` est `null` ; un `Admin` rattaché à un campus ne pilote
 * que son campus.
 */

export function isAdmin(user) {
  return user?.role?.name?.toLowerCase() === 'admin';
}

export function isSuperAdmin(user) {
  return isAdmin(user) && (user?.campus_id === null || user?.campus_id === undefined);
}

/** Rôle autorisé dans la liste (comparaison insensible à la casse). */
export function hasRole(user, roles = []) {
  const current = user?.role?.name?.toLowerCase() || '';
  return roles.some((r) => r.toLowerCase() === current);
}
