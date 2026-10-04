import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Breadcrumb = ({ customItems = null }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const routeLabels = {
    '/dashboard': 'Tableau de bord',
    '/document-library': 'Bibliothèque de documents',
    '/document-upload': 'Téléchargement de documents',
    '/advanced-search': 'Recherche avancée',
    '/user-management': 'Gestion des utilisateurs',
  };

  // Segment d'ID (fiche document) : libellé neutre plutôt que le nombre brut
  const segmentLabel = (path, segment) => {
    if (path.startsWith('/document-library/')) return 'Fiche document';
    return routeLabels?.[path] || segment?.charAt(0)?.toUpperCase() + segment?.slice(1);
  };

  const generateBreadcrumbs = () => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = location?.pathname?.split('/')?.filter(segment => segment);
    const breadcrumbs = [{ label: 'Accueil', path: '/dashboard', icon: 'Home' }];

    let currentPath = '';
    pathSegments?.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segmentLabel(currentPath, segment);
      
      breadcrumbs?.push({
        label,
        path: currentPath,
        isLast: index === pathSegments?.length - 1
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleNavigation = (path) => {
    if (path && path !== location?.pathname) {
      navigate(path);
    }
  };

  if (breadcrumbs?.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 py-3 text-sm font-body" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs?.map((item, index) => (
          <li key={item?.path || index} className="flex items-center">
            {index > 0 && (
              <Icon 
                name="ChevronRight" 
                size={16} 
                className="text-muted-foreground mx-2" 
              />
            )}
            
            {item?.isLast ? (
              <span className="text-foreground font-medium flex items-center space-x-1">
                {item?.icon && <Icon name={item?.icon} size={16} />}
                <span>{item?.label}</span>
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation(item?.path)}
                className="text-muted-foreground hover:text-foreground p-1 h-auto font-body"
              >
                <span className="flex items-center space-x-1">
                  {item?.icon && <Icon name={item?.icon} size={16} />}
                  <span>{item?.label}</span>
                </span>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;