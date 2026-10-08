/**
 * Garde d'authentification asynchrone.
 * Interroge la session (GET /auth/me via useAuth) au premier chargement ;
 * affiche un loader tant que le statut est inconnu.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { RoleGuard } from './RoleGuard';

export function ProtectedRoute({ children }) {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground font-body">Vérification de la session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
