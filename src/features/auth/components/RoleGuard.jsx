/**
 * Garde de rôle : restreint le contenu aux rôles autorisés.
 * Usage : <RoleGuard roles={['Admin']}>…</RoleGuard>
 */
import { useAuth } from '../useAuth';

export function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();

  const userRole = user?.role?.name?.toLowerCase() || '';
  const allowed = roles?.some((r) => r.toLowerCase() === userRole);

  if (!allowed) return fallback;
  return children;
}
