import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { getNotificationTypeMeta, formatRelativeTime } from '../../../lib/formatters';

/**
 * Panneau de notifications du tableau de bord.
 * Présentationnel : les données et les mutations viennent du parent
 * (`features/notifications`), ce composant ne fait que le rendu.
 */
const NotificationCenter = ({
  notifications = [],
  unreadCount = 0,
  isLoading = false,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'unread' ? notifications.filter((n) => !n?.is_read) : notifications;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-warning rounded-lg flex items-center justify-center relative">
              <Icon name="Bell" size={18} className="text-warning-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-error text-error-foreground text-xs rounded-full flex items-center justify-center font-caption">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground font-body">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              iconName="CheckCircle2"
              iconSize={14}
              onClick={onMarkAllRead}
              className="text-muted-foreground hover:text-foreground font-body"
              title="Tout marquer comme lu"
            >
              Tout lire
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Toutes', count: notifications.length },
            { key: 'unread', label: 'Non lues', count: notifications.filter((n) => !n?.is_read).length },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(tab.key)}
              className="font-body"
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="CheckCircle2"
          iconClassName="text-success"
          title="Aucune notification"
          description={filter === 'unread' ? 'Tout est à jour.' : 'Vous serez prévenu ici.'}
        />
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {filtered.slice(0, 6).map((notification, index) => {
            const meta = getNotificationTypeMeta(notification?.type);
            return (
              <div
                key={notification?.notification_id}
                className={`p-4 hover:bg-muted transition-colors duration-200 ${
                  !notification?.is_read ? 'bg-info/5 border-l-4 border-l-info' : ''
                } ${index !== Math.min(filtered.length, 6) - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name={meta.icon} size={16} className="text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <h4 className="text-sm font-body font-medium text-foreground truncate">
                          {notification?.title}
                        </h4>
                        <Badge variant={meta.variant} className="font-caption flex-shrink-0">
                          {meta.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-caption flex-shrink-0">
                        {formatRelativeTime(notification?.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-2">
                      {notification?.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {!notification?.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="Check"
                            iconSize={14}
                            onClick={() => onMarkRead?.(notification.notification_id)}
                            className="text-muted-foreground hover:text-foreground font-caption"
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
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Trash2"
                        iconSize={14}
                        onClick={() => onDelete?.(notification.notification_id)}
                        className="text-muted-foreground hover:text-error"
                        title="Supprimer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          iconName="ExternalLink"
          iconPosition="right"
          iconSize={14}
          onClick={() => navigate('/notifications')}
          fullWidth
          className="font-body"
        >
          Voir toutes les notifications
        </Button>
      </div>
    </div>
  );
};

export default NotificationCenter;
