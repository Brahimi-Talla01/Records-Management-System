import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { useAuth } from '../../features/auth';
import {
  useDashboardSummary,
  useDashboardActivity,
  useDashboardExpiring,
  useDashboardRecentDocuments,
  useDashboardUploads,
} from '../../features/dashboard';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../../features/notifications';
import { mapBackendRole, getRoleLabel } from '../../lib/formatters';
import QuickActionsPanel from './components/QuickActionPanel';
import StatsOverview from './components/StatsOverview';
import RecentActivity from './components/RecentActivity';
import NotificationCenter from './components/NotificationCenter';
import RecentDocuments from './components/RecentDocuments';
import ExpiringDocuments from './components/ExpiringDocuments';
import UploadsChart from './components/UploadsChart';
import SystemStatus from './components/SystemStatus';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Utilisateur réel depuis la session (Zustand + TanStack Query)
  const { user: currentUser, isLoading: authLoading, logout } = useAuth();

  const user = currentUser
    ? {
        id: currentUser.user_id,
        name: currentUser.full_name || currentUser.username,
        email: currentUser.email,
        role: mapBackendRole(currentUser.role?.name),
        department: currentUser.department?.name || '—',
        avatar: null,
      }
    : null;

  // Agrégats du tableau de bord (bornés au périmètre campus côté serveur)
  const summaryQuery = useDashboardSummary();
  const activityQuery = useDashboardActivity({ perPage: 8 });
  const expiringQuery = useDashboardExpiring({ perPage: 6 });
  const recentQuery = useDashboardRecentDocuments({ limit: 6 });
  const uploadsQuery = useDashboardUploads({ months: 12 });

  // Notifications (le compteur non-lu est pollé par le Header et ce panneau)
  const notificationsQuery = useNotifications({ perPage: 6 });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'upload':
        navigate('/document-upload');
        break;
      case 'scan':
        navigate('/document-upload');
        break;
      case 'search':
        navigate('/advanced-search');
        break;
      case 'library':
        navigate('/document-library');
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte côté serveur : on redirige quand même
    } finally {
      navigate('/login');
    }
  };

  const getWelcomeMessage = () => {
    const hour = currentTime?.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground font-body">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background">
      <Header user={user} onLogout={handleLogout} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          {/* Welcome Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-6 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-heading font-bold mb-2">
                    {getWelcomeMessage()}, {user?.name || 'Utilisateur'} !
                  </h1>
                  <p className="text-lg font-body opacity-90 mb-1">
                    {getRoleLabel(user?.role)} - {user?.department}
                  </p>
                  <p className="text-sm font-caption opacity-75">
                    {currentTime?.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {currentTime?.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="w-20 h-20 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                    <Icon name="Archive" size={40} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="mb-8">
            <StatsOverview summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <UploadsChart months={uploadsQuery.data?.months} isLoading={uploadsQuery.isLoading} />

              <RecentDocuments
                documents={recentQuery.data?.items}
                isLoading={recentQuery.isLoading}
              />

              <RecentActivity
                activities={activityQuery.data?.items}
                isLoading={activityQuery.isLoading}
                showViewAll={user?.role === 'admin'}
              />

              <ExpiringDocuments
                documents={expiringQuery.data?.items}
                days={30}
                isLoading={expiringQuery.isLoading}
              />

              <SystemStatus userRole={user?.role} />
            </div>

            <div className="space-y-8">
              <QuickActionsPanel userRole={user?.role} onAction={handleQuickAction} />

              <NotificationCenter
                notifications={notificationsQuery.data?.items}
                unreadCount={unreadCount}
                isLoading={notificationsQuery.isLoading}
                onMarkRead={(id) => markRead.mutate(id)}
                onMarkAllRead={() => markAllRead.mutate()}
                onDelete={(id) => deleteNotification.mutate(id)}
              />

              {/* Help & Support */}
              <div className="bg-card border border-border rounded-lg p-6 shadow-card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-info rounded-lg flex items-center justify-center">
                    <Icon name="HelpCircle" size={18} className="text-info-foreground" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-foreground">Aide & Support</h3>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    iconName="Book"
                    iconPosition="left"
                    iconSize={16}
                    fullWidth
                    className="justify-start font-body"
                  >
                    Guide d'utilisation
                  </Button>
                  <Button
                    variant="ghost"
                    iconName="MessageCircle"
                    iconPosition="left"
                    iconSize={16}
                    fullWidth
                    className="justify-start font-body"
                  >
                    Contacter le support
                  </Button>
                  <Button
                    variant="ghost"
                    iconName="Video"
                    iconPosition="left"
                    iconSize={16}
                    fullWidth
                    className="justify-start font-body"
                  >
                    Tutoriels vidéo
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="bg-info/10 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Icon name="Info" size={16} className="text-info mt-0.5" />
                      <div>
                        <p className="text-sm font-body text-info mb-1">Nouveau dans UniArchive ?</p>
                        <p className="text-xs text-info font-caption">
                          Consultez notre guide de démarrage rapide pour bien commencer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground font-body">
                <span>© {new Date()?.getFullYear()} UniArchive</span>
                <span>•</span>
                <span>Version 2.1.0</span>
                <span>•</span>
                <span>Conforme RGPD</span>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="Shield"
                  iconPosition="left"
                  iconSize={14}
                  className="text-muted-foreground hover:text-foreground font-body"
                >
                  Politique de confidentialité
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="FileText"
                  iconPosition="left"
                  iconSize={14}
                  className="text-muted-foreground hover:text-foreground font-body"
                >
                  Conditions d'utilisation
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
