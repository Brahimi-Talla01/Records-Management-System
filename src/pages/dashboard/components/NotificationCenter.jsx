import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const NotificationCenter = ({ userRole, notifications = [] }) => {
  const [filter, setFilter] = useState('all');

  const mockNotifications = [
    {
      id: 1,
      type: 'security',
      priority: 'high',
      title: 'Tentative d\'accès suspect détectée',
      message: 'Connexion inhabituelle depuis une nouvelle adresse IP (192.168.1.100) pour le compte admin@universite.fr',
      timestamp: new Date(Date.now() - 600000),
      read: false,
      actionRequired: true
    },
    {
      id: 2,
      type: 'approval',
      priority: 'medium',
      title: 'Approbation requise',
      message: 'Le document "Règlement_Examens_2024.pdf" nécessite votre approbation avant publication',
      timestamp: new Date(Date.now() - 1800000),
      read: false,
      actionRequired: true
    },
    {
      id: 3,
      type: 'system',
      priority: 'low',
      title: 'Sauvegarde automatique terminée',
      message: 'Sauvegarde quotidienne effectuée avec succès. 2,847 documents sauvegardés (15.2 GB)',
      timestamp: new Date(Date.now() - 3600000),
      read: true,
      actionRequired: false
    },
    {
      id: 4,
      type: 'document',
      priority: 'medium',
      title: 'Nouveau document partagé',
      message: 'Sophie Laurent a partagé "Guide_Procédures_Administratives.pdf" avec votre département',
      timestamp: new Date(Date.now() - 7200000),
      read: false,
      actionRequired: false
    },
    {
      id: 5,
      type: 'storage',
      priority: 'high',
      title: 'Espace de stockage critique',
      message: 'Utilisation du stockage à 92%. Considérez l\'archivage des anciens documents ou l\'extension de capacité',
      timestamp: new Date(Date.now() - 10800000),
      read: true,
      actionRequired: true
    },
    {
      id: 6,
      type: 'workflow',
      priority: 'low',
      title: 'Workflow terminé',
      message: 'Le processus d\'approbation pour "Thèse_Doctorat_Martin.pdf" est maintenant terminé',
      timestamp: new Date(Date.now() - 14400000),
      read: true,
      actionRequired: false
    }
  ];

  const displayNotifications = notifications?.length > 0 ? notifications : mockNotifications;

  const getNotificationIcon = (type) => {
    const icons = {
      security: 'Shield',
      approval: 'CheckCircle',
      system: 'Settings',
      document: 'FileText',
      storage: 'HardDrive',
      workflow: 'GitBranch'
    };
    return icons?.[type] || 'Bell';
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'bg-red-500';
    if (type === 'security') return 'bg-red-500';
    if (type === 'approval') return 'bg-orange-500';
    if (type === 'system') return 'bg-blue-500';
    if (type === 'document') return 'bg-green-500';
    if (type === 'storage') return 'bg-purple-500';
    if (type === 'workflow') return 'bg-indigo-500';
    return 'bg-gray-500';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
      medium: { label: 'Important', className: 'bg-orange-100 text-orange-800' },
      low: { label: 'Info', className: 'bg-blue-100 text-blue-800' }
    };
    return badges?.[priority] || badges?.low;
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    
    return timestamp?.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredNotifications = displayNotifications?.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification?.read;
    if (filter === 'action') return notification?.actionRequired;
    return notification?.type === filter;
  });

  const unreadCount = displayNotifications?.filter(n => !n?.read)?.length;
  const actionRequiredCount = displayNotifications?.filter(n => n?.actionRequired)?.length;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-warning rounded-lg flex items-center justify-center relative">
              <Icon name="Bell" size={18} color="white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-foreground text-xs rounded-full flex items-center justify-center font-caption">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground font-body">
                {unreadCount} non lues, {actionRequiredCount} actions requises
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="Settings"
            iconSize={14}
            className="text-muted-foreground hover:text-foreground"
            title="Paramètres de notification"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Toutes', count: displayNotifications?.length },
            { key: 'unread', label: 'Non lues', count: unreadCount },
            { key: 'action', label: 'Actions', count: actionRequiredCount },
            { key: 'security', label: 'Sécurité', count: displayNotifications?.filter(n => n?.type === 'security')?.length }
          ]?.map((tab) => (
            <Button
              key={tab?.key}
              variant={filter === tab?.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(tab?.key)}
              className="font-body"
            >
              {tab?.label} ({tab?.count})
            </Button>
          ))}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications?.slice(0, 6)?.map((notification, index) => (
          <div 
            key={notification?.id} 
            className={`p-4 hover:bg-muted transition-colors duration-200 ${
              !notification?.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            } ${
              index !== filteredNotifications?.slice(0, 6)?.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-10 h-10 ${getNotificationColor(notification?.type, notification?.priority)} rounded-full flex items-center justify-center flex-shrink-0`}>
                <Icon name={getNotificationIcon(notification?.type)} size={16} color="white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-body font-medium text-foreground">
                      {notification?.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-caption ${getPriorityBadge(notification?.priority)?.className}`}>
                      {getPriorityBadge(notification?.priority)?.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-caption flex-shrink-0">
                    {formatTimestamp(notification?.timestamp)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground font-body mb-3 line-clamp-2">
                  {notification?.message}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {!notification?.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Check"
                        iconSize={14}
                        className="text-muted-foreground hover:text-foreground font-caption"
                      >
                        Marquer comme lu
                      </Button>
                    )}
                    {notification?.actionRequired && (
                      <Button
                        variant="outline"
                        size="sm"
                        iconName="ExternalLink"
                        iconSize={14}
                        className="font-caption"
                      >
                        Action requise
                      </Button>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="X"
                    iconSize={14}
                    className="text-muted-foreground hover:text-foreground"
                    title="Ignorer"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredNotifications?.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="CheckCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-heading font-medium text-foreground mb-2">
            Aucune notification
          </h3>
          <p className="text-muted-foreground font-body">
            {filter === 'all' ? 'Vous êtes à jour !' : `Aucune notification ${filter === 'unread' ? 'non lue' : filter === 'action' ? 'nécessitant une action' : 'de ce type'}`}
          </p>
        </div>
      )}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          iconName="ExternalLink"
          iconPosition="right"
          iconSize={14}
          onClick={() => window.location.href = '/notifications'}
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