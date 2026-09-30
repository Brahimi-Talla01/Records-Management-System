import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from './pages/login';
import UserManagement from './pages/user-management';
import DocumentLibrary from './pages/document-library';
import Dashboard from './pages/dashboard';
import DocumentUpload from './pages/document-upload';
import AdvancedSearch from './pages/advanced-search';
import ScrollToTop from "./components/ScrollToTop";
import { ProtectedRoute, useAuth } from "./features/auth";

// Redirection de la racine selon l'état de session (cookie, vérifié via /me)
const RootRedirect = () => {
  const { status, isAuthenticated } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Route racine - redirige selon l'état de session */}
          <Route path="/" element={<RootRedirect />} />

          {/* Route de connexion */}
          <Route path="/login" element={<Login />} />

          {/* Routes protégées */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document-library"
            element={
              <ProtectedRoute>
                <DocumentLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document-upload"
            element={
              <ProtectedRoute>
                <DocumentUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advanced-search"
            element={
              <ProtectedRoute>
                <AdvancedSearch />
              </ProtectedRoute>
            }
          />

          {/* Page 404 */}
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
