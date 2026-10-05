import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../features/auth';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../../features/notifications';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import { toAppError } from '../../lib/errors';
import {
  mapBackendRole,
  getNotificationTypeMeta,
  formatRelativeTime,
  formatDateTime,
} from '../../lib/formatters';

const PER_PAGE = 20;

/** Liste complète des notifications du compte (filtre non-lues + pagination). */
const Notifications = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notificationsQuery = useNotifications({ page, perPage: PER_PAGE, unreadOnly });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà close
    } finally {
      navigate('/login');
    }
  };

  const data = notificationsQuery.data;
  const notifications = data?.items || [];
  const pages = data?.pages || 1;

  const handleMarkRead = (id) => {
    markRead.mutate(id, {
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('Notifications marquées comme lues.'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Supprimer la notification',
      description: 'Cette notification sera définitivement supprimée.',
      confirmLabel: 'Supprimer',
      variant: 'error',
    });
    if (!confirmed) return;
    deleteNotification.mutate(id, {
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
                <Icon name="Bell" size={20} className="text-warning-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">Notifications</h1>
                <p className="text-sm text-muted-foreground font-body">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''} sur {data?.total ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={unreadOnly ? 'default' : 'outline'}
                size="sm"
                iconName="Filter"
                iconPosition="left"
                iconSize={14}
                onClick={() => {
                  setUnreadOnly((prev) => !prev);
                  setPage(1);
                }}
                className="font-body"
              >
                Non lues
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="CheckCircle2"
                iconPosition="left"
                iconSize={14}
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="font-body"
              >
                Tout marquer comme lu
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-card">
            {notificationsQuery.isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon="CheckCircle2"
                iconClassName="text-success"
                title="Aucune notification"
                description={unreadOnly ? 'Tout est à jour.' : 'Vous serez prévenu ici.'}
              />
            ) : (
              <div>
                {notifications.map((notification, index) => {
                  const meta = getNotificationTypeMeta(notification?.type);
                  return (
                    <div
                      key={notification?.notification_id}
                      className={`p-5 flex items-start space-x-4 ${
                        !notification?.is_read ? 'bg-info/5' : ''
                      } ${index !== notifications.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon name={meta.icon} size={18} className="text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-sm font-body font-semibold text-foreground truncate">
                              {notification?.title}
                            </h3>
                            <Badge variant={meta.variant} className="font-caption flex-shrink-0">
                              {meta.label}
                            </Badge>
                            {!notification?.is_read && (
                              <span className="w-2 h-2 rounded-full bg-info flex-shrink-0" />
                            )}
                          </div>
                          <span
                            className="text-xs text-muted-foreground font-caption flex-shrink-0"
                            title={formatDateTime(notification?.created_at)}
                          >
                            {formatRelativeTime(notification?.created_at)}
                          </span>
                        </div>

                        {notification?.message && (
                          <p className="text-sm text-muted-foreground font-body mb-3">
                            {notification.message}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          {!notification?.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              iconName="Check"
                              iconSize={14}
                              onClick={() => handleMarkRead(notification.notification_id)}
                              className="font-caption text-muted-foreground hover:text-foreground"
                            >
                              Marquer comme lu
                            </Button>
                          )}
                          {notification?.action_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              iconName="ExternalLink"
                              iconSize={14}
                              onClick={() => navigate(notification.action_url)}
                              className="font-caption"
                            >
                              Ouvrir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="Trash2"
                            iconSize={14}
                            onClick={() => handleDelete(notification.notification_id)}
                            className="font-caption text-muted-foreground hover:text-error"
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground font-body">
                  Page {data?.page || 1} sur {pages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ArrowLeft"
                    iconPosition="left"
                    iconSize={14}
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    className="font-body"
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ChevronRight"
                    iconPosition="right"
                    iconSize={14}
                    disabled={page >= pages}
                    onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
                    className="font-body"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notifications;
