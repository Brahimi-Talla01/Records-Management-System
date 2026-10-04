import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { getAlertSeverityMeta } from '../../../lib/formatters';

const ActivityPanel = ({ activities = [], securityAlerts = [], onResolveAlert = null }) => {
  const formatActivityTime = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return activityDate?.toLocaleDateString('fr-FR');
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      login: 'LogIn',
      logout: 'LogOut',
      create: 'UserPlus',
      update: 'Edit',
      delete: 'UserX',
      password_reset: 'Key',
      role_change: 'Shield',
      status_change: 'ToggleLeft'
    };
    return iconMap?.[type] || 'Activity';
  };

  const getActivityColor = (type) => {
    const colorMap = {
      login: 'text-success',
      logout: 'text-muted-foreground',
      create: 'text-accent',
      update: 'text-warning',
      delete: 'text-error',
      password_reset: 'text-secondary',
      role_change: 'text-primary',
      status_change: 'text-accent'
    };
    return colorMap?.[type] || 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Security Alerts */}
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Shield" size={18} className="text-error" />
              <h3 className="font-heading font-medium text-foreground">Alertes de sécurité</h3>
            </div>
            <Button variant="ghost" size="sm" className="font-body">
              Voir tout
            </Button>
          </div>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {securityAlerts?.length > 0 ? (
            securityAlerts?.map((alert) => {
              const severity = getAlertSeverityMeta(alert?.severity);
              return (
                <div key={alert?.id} className="p-4 border-b border-border last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Badge variant={severity.variant} className="mt-0.5 shrink-0">
                      {severity.label}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium text-sm text-foreground">
                        {alert?.title}
                      </p>
                      <p className="text-sm text-muted-foreground font-body mb-2">
                        {alert?.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-caption">
                          {formatActivityTime(alert?.timestamp)}
                        </p>
                        {onResolveAlert && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-body"
                            onClick={() => onResolveAlert(alert?.id)}
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center">
              <Icon name="ShieldCheck" size={32} className="mx-auto text-success mb-2" />
              <p className="text-sm font-body text-muted-foreground">
                Aucune alerte de sécurité active
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Activity" size={18} className="text-accent" />
              <h3 className="font-heading font-medium text-foreground">Activité récente</h3>
            </div>
            <Button variant="ghost" size="sm" className="font-body">
              Voir tout
            </Button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {activities?.length > 0 ? (
            activities?.map((activity) => (
              <div key={activity?.id} className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors duration-200">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${getActivityColor(activity?.type)}`}>
                    <Icon name={getActivityIcon(activity?.type)} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground mb-1">
                      <span className="font-medium">{activity?.user}</span> {activity?.action}
                    </p>
                    {activity?.details && (
                      <p className="text-sm text-muted-foreground font-body mb-2">
                        {activity?.details}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-caption">
                        {formatActivityTime(activity?.timestamp)}
                      </p>
                      {activity?.ip && (
                        <p className="text-xs text-muted-foreground font-data">
                          IP: {activity?.ip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <Icon name="Clock" size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-body text-muted-foreground">
                Aucune activité récente
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Quick Stats */}
      <div className="bg-card border border-border rounded-lg shadow-card p-4">
        <h3 className="font-heading font-medium text-foreground mb-4">Statistiques rapides</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <Icon name="Users" size={24} className="mx-auto text-accent mb-2" />
            <p className="text-lg font-heading font-semibold text-foreground">1,247</p>
            <p className="text-xs text-muted-foreground font-caption">Utilisateurs totaux</p>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <Icon name="UserCheck" size={24} className="mx-auto text-success mb-2" />
            <p className="text-lg font-heading font-semibold text-foreground">1,156</p>
            <p className="text-xs text-muted-foreground font-caption">Comptes actifs</p>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <Icon name="LogIn" size={24} className="mx-auto text-primary mb-2" />
            <p className="text-lg font-heading font-semibold text-foreground">342</p>
            <p className="text-xs text-muted-foreground font-caption">Connexions (24h)</p>
          </div>
          
          <div className="text-center p-3 bg-muted rounded-lg">
            <Icon name="AlertTriangle" size={24} className="mx-auto text-warning mb-2" />
            <p className="text-lg font-heading font-semibold text-foreground">12</p>
            <p className="text-xs text-muted-foreground font-caption">Alertes actives</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;