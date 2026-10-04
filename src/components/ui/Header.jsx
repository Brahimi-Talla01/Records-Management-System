import { Fragment, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth, isAdmin, isSuperAdmin } from '../../features/auth';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../features/notifications';
import { getNotificationTypeMeta, formatRelativeTime } from '../../lib/formatters';

const Header = ({ user = null, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user: sessionUser } = useAuth();

  // Notifications réelles : compteur pollé (Q5) + dernières entrées pour le panneau.
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const notificationsQuery = useNotifications({ perPage: 5 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data?.items || [];

  // Espace Administration regroupé (Q9) : visible pour un Admin, avec les
  // entrées super admin (campus, rétention) en plus. La garde UI n'est qu'un
  // confort : le serveur refuse chaque endpoint (A7).
  const admin = isAdmin(sessionUser);
  const superAdmin = isSuperAdmin(sessionUser);
  const adminMenuItems = [
    { label: 'Utilisateurs', path: '/user-management', icon: 'Users' },
    { label: 'Référentiels', path: '/referentials', icon: 'Library' },
    { label: 'Permissions', path: '/permissions', icon: 'ShieldCheck' },
    { label: 'Audit', path: '/audit', icon: 'ScrollText' },
    { label: 'Réglages', path: '/settings', icon: 'Settings' },
    ...(superAdmin
      ? [
          { label: 'Campus', path: '/campuses', icon: 'Building2' },
          { label: 'Rétention', path: '/retention', icon: 'Clock' },
        ]
      : []),
  ];

  const navigationItems = [
    { label: 'Tableau de bord', path: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Bibliothèque', path: '/document-library', icon: 'FolderOpen' },
    { label: 'Télécharger', path: '/document-upload', icon: 'Upload' },
    { label: 'Recherche', path: '/advanced-search', icon: 'Search' },
    { label: 'Mon compte', path: '/account', icon: 'User' },
  ];

  const isActive = (path) => location?.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false); // Ferme le menu après navigation mobile
    setIsAdminMenuOpen(false);
  };


  // Logout par session : révoque la session serveur + purge le state,
  // puis redirige (onLogout externe optionnel exécuté après).
  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte côté serveur : on redirige quand même
    } finally {
      if (onLogout) onLogout();
      navigate('/login');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-card border-b border-border shadow-md">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <a href="/dashboard" className="flex items-center space-x-3 group transition-opacity duration-300 hover:opacity-80">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Icon name="Archive" size={20} className="text-primary-foreground group-hover:rotate-6 transition-transform" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">UniArchive</h1>
              <p className="text-xs text-muted-foreground font-caption leading-none">Gestion documentaire universitaire</p>
            </div>
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Fragment key={item?.path}>
              <Button
                variant={isActive(item?.path) ? "default" : "ghost"}
                size="sm"
                iconName={item?.icon}
                iconPosition="left"
                iconSize={16}
                onClick={() => handleNavigation(item?.path)}
                className={`font-body font-medium transition-colors ${
                  isActive(item?.path) ? 'text-primary-foreground' : 'text-foreground hover:text-primary'
                }`}
              >
                {item?.label}
              </Button>
            </Fragment>
          ))}

          {/* Espace Administration (menu regroupé, Q9) */}
          {admin && (
            <div className="relative ml-2 pl-2 border-l border-border">
              <Button
                variant={location.pathname.startsWith('/user-management') || location.pathname.startsWith('/settings') || location.pathname.startsWith('/campuses') || location.pathname.startsWith('/audit') || location.pathname.startsWith('/retention') || location.pathname.startsWith('/permissions') || location.pathname.startsWith('/referentials') ? "default" : "ghost"}
                size="sm"
                iconName="Shield"
                iconPosition="left"
                iconSize={16}
                onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                aria-expanded={isAdminMenuOpen}
                className="font-body font-medium transition-colors text-foreground hover:text-primary"
              >
                Administration
              </Button>

              {isAdminMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[990]"
                    onClick={() => setIsAdminMenuOpen(false)}
                  />
                  <div className="absolute top-full mt-2 left-0 w-56 bg-popover border border-border rounded-lg shadow-xl z-[1000] animate-in slide-in-from-top-1 fade-in-0 duration-200">
                    <div className="py-2">
                      {adminMenuItems.map((item) => (
                        <Button
                          key={item.path}
                          variant="ghost"
                          size="sm"
                          iconName={item.icon}
                          iconPosition="left"
                          iconSize={16}
                          onClick={() => handleNavigation(item.path)}
                          fullWidth
                          className={`justify-start font-body ${
                            isActive(item.path) ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative transition-colors duration-200"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
            >
              <Icon name="Bell" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-error text-error-foreground text-[10px] rounded-full flex items-center justify-center font-bold font-caption shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
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
                <div className="absolute top-full mt-3 w-80 right-0 bg-popover border border-border rounded-lg shadow-xl z-[1000] animate-in slide-in-from-top-1 fade-in-0 duration-300">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-heading font-semibold text-lg text-popover-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllRead.mutate()}
                        className="font-caption text-primary hover:text-primary"
                      >
                        Tout lire
                      </Button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notificationsQuery.isLoading ? (
                      <p className="p-4 text-sm text-muted-foreground font-body">Chargement…</p>
                    ) : notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground font-body">
                        Aucune notification.
                      </p>
                    ) : (
                      notifications.map((notification) => {
                        const meta = getNotificationTypeMeta(notification?.type);
                        const dotClass = notification?.is_read
                          ? 'bg-border'
                          : meta.variant === 'error'
                            ? 'bg-error'
                            : meta.variant === 'warning'
                              ? 'bg-warning'
                              : meta.variant === 'success'
                                ? 'bg-success'
                                : 'bg-info';
                        return (
                          <div
                            key={notification?.notification_id}
                            className={`p-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors duration-200 ${
                              !notification?.is_read ? 'bg-info/5' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-body font-medium text-sm text-popover-foreground truncate">
                                  {notification?.title}
                                </p>
                                <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-0.5">
                                  {notification?.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-[10px] text-muted-foreground font-caption">
                                    {formatRelativeTime(notification?.created_at)}
                                  </p>
                                  {!notification?.is_read && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markRead.mutate(notification.notification_id)}
                                      className="text-[10px] h-auto py-0 px-1 font-caption text-primary hover:text-primary"
                                    >
                                      Marquer lu
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        setIsNotificationOpen(false);
                        navigate('/notifications');
                      }}
                      className="font-body text-primary hover:text-primary"
                    >
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
                <Icon name="User" size={18} className="text-secondary-foreground" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-error transition-colors duration-200"
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
              {navigationItems.map((item) => (
                <div key={item?.path}>
                  <Button
                    variant={isActive(item?.path) ? "default" : "ghost"}
                    size="sm"
                    iconName={item?.icon}
                    iconPosition="left"
                    iconSize={18}
                    onClick={() => handleNavigation(item?.path)}
                    fullWidth
                    className={`justify-start font-body font-medium transition-colors ${
                      isActive(item?.path) ? 'text-primary' : 'text-foreground hover:text-primary'
                    }`}
                  >
                    {item?.label}
                  </Button>
                </div>
              ))}

              {/* Espace Administration regroupé (Q9) */}
              {admin && (
                <>
                  <p className="text-xs font-caption text-muted-foreground mb-1 px-3 mt-3 border-t pt-3 border-border">
                    Administration
                  </p>
                  {adminMenuItems.map((item) => (
                    <div key={item?.path}>
                      <Button
                        variant={isActive(item?.path) ? "default" : "ghost"}
                        size="sm"
                        iconName={item?.icon}
                        iconPosition="left"
                        iconSize={18}
                        onClick={() => handleNavigation(item?.path)}
                        fullWidth
                        className={`justify-start font-body font-medium transition-colors ${
                          isActive(item?.path) ? 'text-primary' : 'text-foreground hover:text-primary'
                        }`}
                      >
                        {item?.label}
                      </Button>
                    </div>
                  ))}
                </>
              )}
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