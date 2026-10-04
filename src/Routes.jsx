import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import { RequireAuth, RequireRole, useAuth } from "./features/auth";

// Chaque écran est un chunk séparé (budget de bundle, A10).
const Login = lazy(() => import('./pages/login'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const UserManagement = lazy(() => import('./pages/user-management'));
const DocumentLibrary = lazy(() => import('./pages/document-library'));
const DocumentDetail = lazy(() => import('./pages/document-detail'));
const DocumentUpload = lazy(() => import('./pages/document-upload'));
const AdvancedSearch = lazy(() => import('./pages/advanced-search'));
const Account = lazy(() => import('./pages/account'));
const Notifications = lazy(() => import('./pages/notifications'));
const ResetPassword = lazy(() => import('./pages/reset-password'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Forbidden = lazy(() => import('./pages/Forbidden'));

// Titre de document piloté par la route (accessibilité + historique navigateur)
const ROUTE_TITLES = {
  '/login': 'Connexion',
  '/dashboard': 'Tableau de bord',
  '/user-management': 'Gestion des utilisateurs',
  '/document-library': 'Bibliothèque de documents',
  '/document-detail': 'Fiche document',
  '/document-upload': 'Dépôt de documents',
  '/advanced-search': 'Recherche avancée',
  '/account': 'Mon compte',
  '/notifications': 'Notifications',
  '/reset-password': 'Réinitialisation du mot de passe',
  '/forbidden': 'Accès refusé',
};

// Préfixes pour les chemins paramétrés (l'exact ne peut pas les couvrir)
const ROUTE_PREFIX_TITLES = {
  '/document-library/': 'Fiche document',
};

const RouteTitle = () => {
  const location = useLocation();

  useEffect(() => {
    // Correspondance exacte, puis préfixe (routes dynamiques : fiche document…)
    const label =
      ROUTE_TITLES[location.pathname] ||
      Object.entries(ROUTE_PREFIX_TITLES).find(([prefix]) =>
        location.pathname.startsWith(prefix)
      )?.[1];
    document.title = label ? `${label} — UniArchive` : 'UniArchive';
  }, [location.pathname]);

  return null;
};

// Redirection de la racine selon l'état de session (cookie, vérifié via /me)
const RootRedirect = () => {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return <RouteFallback />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

// Écran de chargement partagé (chunk lazy ou session).
const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Frontière d'erreur + Suspense par route : l'échec d'un chunk n'abat pas l'app.
const RouteShell = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>{children}</Suspense>
  </ErrorBoundary>
);

const Routes = () => {
  return (
    <BrowserRouter>
      <RouteTitle />
      <ScrollToTop />
      <RouterRoutes>
        {/* Route racine - redirige selon l'état de session */}
        <Route path="/" element={<RootRedirect />} />

        {/* Route de connexion */}
        <Route path="/login" element={<RouteShell><Login /></RouteShell>} />

        {/* Routes protégées */}
        <Route
          path="/dashboard"
          element={
            <RouteShell>
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            </RouteShell>
          }
        />
        {/* Écran d'administration : réservé aux admins (rôle vérifié côté serveur) */}
        <Route
          path="/user-management"
          element={
            <RouteShell>
              <RequireAuth>
                <RequireRole roles={['Admin']}>
                  <UserManagement />
                </RequireRole>
              </RequireAuth>
            </RouteShell>
          }
        />
        <Route
          path="/document-library"
          element={
            <RouteShell>
              <RequireAuth>
                <DocumentLibrary />
              </RequireAuth>
            </RouteShell>
          }
        />
        {/* Fiche document : `document_id` dans l'URL (partageable) */}
        <Route
          path="/document-library/:documentId"
          element={
            <RouteShell>
              <RequireAuth>
                <DocumentDetail />
              </RequireAuth>
            </RouteShell>
          }
        />
        <Route
          path="/document-upload"
          element={
            <RouteShell>
              <RequireAuth>
                <DocumentUpload />
              </RequireAuth>
            </RouteShell>
          }
        />
        <Route
          path="/advanced-search"
          element={
            <RouteShell>
              <RequireAuth>
                <AdvancedSearch />
              </RequireAuth>
            </RouteShell>
          }
        />

        {/* Compte connecté : profil, mot de passe, 2FA, appareils, alertes */}
        <Route
          path="/account"
          element={
            <RouteShell>
              <RequireAuth>
                <Account />
              </RequireAuth>
            </RouteShell>
          }
        />

        {/* Toutes les notifications du compte connecté */}
        <Route
          path="/notifications"
          element={
            <RouteShell>
              <RequireAuth>
                <Notifications />
              </RequireAuth>
            </RouteShell>
          }
        />

        {/* Réinitialisation par lien email : route publique (token d'autorisation) */}
        <Route
          path="/reset-password"
          element={
            <RouteShell>
              <ResetPassword />
            </RouteShell>
          }
        />

        {/* Page 403 */}
        <Route path="/forbidden" element={<RouteShell><Forbidden /></RouteShell>} />

        {/* Page 404 */}
        <Route path="*" element={<RouteShell><NotFound /></RouteShell>} />
      </RouterRoutes>
    </BrowserRouter>
  );
};

export default Routes;
