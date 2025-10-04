import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SystemStatus = ({ userRole }) => {
  const systemMetrics = [
    {
      id: 'server_status',
      label: 'Statut Serveur',
      value: 'Opérationnel',
      status: 'healthy',
      icon: 'Server',
      details: 'Temps de réponse: 45ms'
    },
    {
      id: 'database_status',
      label: 'Base de Données',
      value: 'Connectée',
      status: 'healthy',
      icon: 'Database',
      details: '2,847 documents indexés'
    },
    {
      id: 'storage_usage',
      label: 'Stockage',
      value: '2.4 TB / 5.0 TB',
      status: 'warning',
      icon: 'HardDrive',
      details: '48% utilisé'
    },
    {
      id: 'backup_status',
      label: 'Dernière Sauvegarde',
      value: 'Il y a 2h',
      status: 'healthy',
      icon: 'Shield',
      details: 'Sauvegarde automatique réussie'
    },
    {
      id: 'active_users',
      label: 'Utilisateurs Actifs',
      value: '127',
      status: 'healthy',
      icon: 'Users',
      details: 'Pic à 14h: 189 utilisateurs'
    },
    {
      id: 'security_alerts',
      label: 'Alertes Sécurité',
      value: '2 Actives',
      status: 'error',
      icon: 'AlertTriangle',
      details: 'Tentatives d\'accès suspects'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return 'CheckCircle';
      case 'warning':
        return 'AlertCircle';
      case 'error':
        return 'XCircle';
      default:
        return 'Circle';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return { label: 'OK', className: 'bg-green-100 text-green-800' };
      case 'warning':
        return { label: 'Attention', className: 'bg-orange-100 text-orange-800' };
      case 'error':
        return { label: 'Erreur', className: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Inconnu', className: 'bg-gray-100 text-gray-800' };
    }
  };

  // Only show system status for admin users
  if (userRole !== 'admin') {
    return null;
  }

  const healthyCount = systemMetrics?.filter(m => m?.status === 'healthy')?.length;
  const warningCount = systemMetrics?.filter(m => m?.status === 'warning')?.length;
  const errorCount = systemMetrics?.filter(m => m?.status === 'error')?.length;

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Icon name="Activity" size={18} color="white" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">État du Système</h2>
              <p className="text-sm text-muted-foreground font-body">
                {healthyCount} OK • {warningCount} Attention • {errorCount} Erreur
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              errorCount > 0 ? 'bg-error' : 
              warningCount > 0 ? 'bg-warning': 'bg-success'
            } animate-pulse`} />
            <span className="text-sm font-body text-muted-foreground">
              {errorCount > 0 ? 'Problèmes détectés' : 
               warningCount > 0 ? 'Surveillance requise': 'Tout fonctionne'}
            </span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemMetrics?.map((metric) => (
            <div key={metric?.id} className="bg-muted rounded-lg p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                    <Icon name={metric?.icon} size={18} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-body font-medium text-foreground">
                      {metric?.label}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon 
                    name={getStatusIcon(metric?.status)} 
                    size={16} 
                    className={getStatusColor(metric?.status)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-heading font-semibold text-foreground">
                    {metric?.value}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-caption ${getStatusBadge(metric?.status)?.className}`}>
                    {getStatusBadge(metric?.status)?.label}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground font-caption">
                  {metric?.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* System Actions */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="RefreshCw"
              iconPosition="left"
              iconSize={14}
              className="font-body"
            >
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              iconPosition="left"
              iconSize={14}
              className="font-body"
            >
              Rapport Système
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="Settings"
              iconPosition="left"
              iconSize={14}
              onClick={() => window.location.href = '/system-settings'}
              className="font-body"
            >
              Paramètres
            </Button>
            {(errorCount > 0 || warningCount > 0) && (
              <Button
                variant="destructive"
                size="sm"
                iconName="AlertTriangle"
                iconPosition="left"
                iconSize={14}
                className="font-body"
              >
                Résoudre les Problèmes
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;