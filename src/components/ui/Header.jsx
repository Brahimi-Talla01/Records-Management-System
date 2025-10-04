import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = ({ user = null, onLogout = () => {} }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Logique de navigation (conservée)
  const navigationItems = [
    { label: 'Tableau de bord', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Bibliothèque', path: '/document-library', icon: 'FolderOpen' },
    { label: 'Télécharger', path: '/document-upload', icon: 'Upload' },
    { label: 'Recherche', path: '/advanced-search', icon: 'Search' },
  ];

  const adminItems = [
    { label: 'Gestion utilisateurs', path: '/user-management', icon: 'Users' },
  ];

  const isActive = (path) => location?.pathname === path;

  const handleNavigation = (path) => {
    window.location.href = path;
    setIsMenuOpen(false); // Ferme le menu après navigation mobile
  };


  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-data");
    navigate("/login");
  };

  const notifications = [
    { id: 1, title: 'Nouveau document ajouté', message: 'Document "Rapport_2025.pdf" a été téléchargé', time: '5 min', type: 'info' },
    { id: 2, title: 'Sauvegarde terminée', message: 'Sauvegarde automatique effectuée avec succès', time: '1h', type: 'success' },
    { id: 3, title: 'Espace de stockage', message: 'Utilisation à 85% - Considérer l\'archivage', time: '2h', type: 'warning' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-[var(--color-card)] border-b border-border shadow-md">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <a href="/dashboard" className="flex items-center space-x-3 group transition-opacity duration-300 hover:opacity-80">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Icon name="Archive" size={20} color="white" className="group-hover:rotate-6 transition-transform" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">UniArchive</h1>
              <p className="text-xs text-muted-foreground font-caption leading-none">Gestion documentaire universitaire</p>
            </div>
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {/* Fusion de navigationItems et adminItems pour un code plus sec */}
          {[...navigationItems, ...(user?.role === 'admin' ? adminItems : [])].map((item, index) => (
            <>
              {/* Ajout d'un séparateur pour les éléments Admin */}
              {user?.role === 'admin' && index === navigationItems.length && (
                <div className="mx-2 h-6 w-px bg-border"></div>
              )}
              <Button
                key={item?.path}
                variant={isActive(item?.path) ? "default" : "ghost"}
                size="sm"
                iconName={item?.icon}
                iconPosition="left"
                iconSize={16}
                onClick={() => handleNavigation(item?.path)}
                className={`font-body font-medium transition-colors ${
                  isActive(item?.path) ? 'text-card' : 'text-foreground hover:text-primary-dark'
                }`}
              >
                {item?.label}
              </Button>
            </>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative transition-colors duration-200 hover:bg-primary"
            >
              <Icon name="Bell" size={20} />
              {notifications?.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-error-foreground text-[10px] rounded-full flex items-center justify-center font-bold font-caption shadow-sm">
                  {notifications?.length}
                </span>
              )}
            </Button>

            {isNotificationOpen && (
              <>
                {/* Overlay pour fermer en cliquant à l'extérieur (z-index ajusté) */}
                <div 
                  className="fixed inset-0 z-[990]"
                  onClick={() => setIsNotificationOpen(false)}
                />
                
                {/* Conteneur des notifications */}
                <div className="absolute right-0 top-full mt-3 w-80 bg-popover border border-border rounded-lg shadow-xl z-[1000] animate-in slide-in-from-top-1 fade-in-0 duration-300">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-heading font-semibold text-lg text-popover-foreground">Alertes Récentes</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications?.map((notification) => (
                      <div 
                        key={notification?.id} 
                        className="p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors duration-200 cursor-pointer"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            notification?.type === 'success' ? 'bg-success' :
                            notification?.type === 'warning' ? 'bg-warning' :
                            notification?.type === 'error' ? 'bg-destructive' : 'bg-primary'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-body font-medium text-sm text-popover-foreground truncate">{notification?.title}</p>
                            <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-0.5">{notification?.message}</p>
                            <p className="text-[10px] text-muted-foreground font-caption mt-1">{notification?.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border">
                    <Button variant="ghost" size="sm" fullWidth className="font-body text-primary hover:text-primary-dark">
                      Voir toutes les notifications
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-border ml-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-body font-semibold text-foreground truncate max-w-[100px]">{user?.name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground font-caption leading-none">{user?.role || 'Utilisateur'}</p>
              </div>
              <div className="w-9 h-9 bg-secondary/80 hover:bg-secondary transition-colors rounded-full flex items-center justify-center cursor-pointer">
                <Icon name="User" size={18} color="white" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive transition-colors duration-200"
              >
                <Icon name="LogOut" size={18} />
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              // Ferme les notifications si on ouvre le menu mobile
              if (isNotificationOpen) setIsNotificationOpen(false); 
            }}
            className="lg:hidden ml-1"
          >
            <Icon name={isMenuOpen ? "X" : "Menu"} size={22} />
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <>
          <div className="lg:hidden bg-card border-t border-border shadow-2xl absolute w-full z-[999] animate-in slide-in-from-top-1 fade-in-0 duration-300">
            <nav className="px-4 py-4 space-y-1">
              {[...navigationItems, ...(user?.role === 'admin' ? adminItems : [])].map((item, index) => (
                <div key={item?.path}>
                   {/* Ajout d'un titre de section pour l'admin en mobile */}
                   {user?.role === 'admin' && index === navigationItems.length && (
                      <p className="text-xs font-caption text-muted-foreground mb-1 px-3 mt-3 border-t pt-3 border-border">Administration</p>
                    )}
                    <Button
                      variant={isActive(item?.path) ? "default" : "ghost"}
                      size="sm"
                      iconName={item?.icon}
                      iconPosition="left"
                      iconSize={18}
                      onClick={() => handleNavigation(item?.path)}
                      fullWidth
                      className={`justify-start font-body font-medium transition-colors ${
                        isActive(item?.path) ? 'text-primary' : 'text-foreground hover:text-primary-dark'
                      }`}
                    >
                      {item?.label}
                    </Button>
                </div>
              ))}
            </nav>
          </div>
          {/* Overlay pour le menu mobile (z-index ajusté) */}
          <div 
            className="fixed inset-0 bg-black/40 z-[980] lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        </>
      )}
      
      {/* L'overlay de notification est déjà géré à l'intérieur de son bloc pour une meilleure gestion du z-index */}
    </header>
  );
};

export default Header;