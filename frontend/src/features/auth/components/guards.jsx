/**
 * Gardes de route déclaratives (A7).
 *
 * Une garde UI n'est qu'un confort : le backend reste la seule autorité.
 *   RequireAuth  — session valide (sinon → /login)
 *   RequireRole  — rôles autorisés (sinon → /forbidden)
 *   RequireScope — écrans super admin : Admin **sans** campus
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { isSuperAdmin } from '../permissions';

export function RequireAuth({ children }) {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children ?? <Outlet />;
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth();
  const current = user?.role?.name?.toLowerCase() || '';
  const allowed = roles?.some((r) => r.toLowerCase() === current);

  if (!allowed) return <Navigate to="/forbidden" replace />;
  return children ?? <Outlet />;
}

export function RequireScope({ children }) {
  const { user } = useAuth();

  if (!isSuperAdmin(user)) return <Navigate to="/forbidden" replace />;
  return children ?? <Outlet />;
}
