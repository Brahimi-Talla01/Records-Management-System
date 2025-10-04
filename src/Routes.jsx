import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from './pages/login';
import UserManagement from './pages/user-management';
import DocumentLibrary from './pages/document-library';
import Dashboard from './pages/dashboard';
import DocumentUpload from './pages/document-upload';
import AdvancedSearch from './pages/advanced-search';
import ScrollToTop from "./components/ScrollToTop";

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Define your route here */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/document-library" element={<DocumentLibrary />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/document-upload" element={<DocumentUpload />} />
          <Route path="/advanced-search" element={<AdvancedSearch />} />
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
