import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RecentActivity = ({ userRole, activities = [] }) => {
  const mockActivities = [
    {
      id: 1,
      type: 'upload',
      title: 'Document téléchargé',
      description: 'Rapport_Annuel_2024.pdf a été ajouté',
      user: 'Marie Dubois',
      timestamp: new Date(Date.now() - 300000),
      icon: 'Upload',
      color: 'bg-green-500'
    },
    {
      id: 2,
      type: 'access',
      title: 'Document consulté',
      description: 'Thèse_Intelligence_Artificielle.pdf',
      user: 'Jean Martin',
      timestamp: new Date(Date.now() - 900000),
      icon: 'Eye',
      color: 'bg-blue-500'
    },
    {
      id: 3,
      type: 'approval',
      title: 'Approbation requise',
      description: 'Modification du document Règlement_Intérieur.pdf',
      user: 'Sophie Laurent',
      timestamp: new Date(Date.now() - 1800000),
      icon: 'AlertCircle',
      color: 'bg-orange-500'
    },
    {
      id: 4,
      type: 'share',
      title: 'Document partagé',
      description: 'Cours_Mathématiques_L1.pdf partagé avec Département Math',
      user: 'Pierre Durand',
      timestamp: new Date(Date.now() - 3600000),
      icon: 'Share2',
      color: 'bg-purple-500'
    },
    {
      id: 5,
      type: 'delete',
      title: 'Document archivé',
      description: 'Ancien_Syllabus_2023.pdf déplacé vers les archives',
      user: 'Admin Système',
      timestamp: new Date(Date.now() - 7200000),
      icon: 'Archive',
      color: 'bg-gray-500'
    },
    {
      id: 6,
      type: 'scan',
      title: 'Document numérisé',
      description: 'Formulaire_Inscription_Manuscrit.pdf créé',
      user: 'Secrétariat',
      timestamp: new Date(Date.now() - 10800000),
      icon: 'Scan',
      color: 'bg-indigo-500'
    }
  ];

  const displayActivities = activities?.length > 0 ? activities : mockActivities;

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

  const getActivityTypeLabel = (type) => {
    const labels = {
      upload: 'Téléchargement',
      access: 'Consultation',
      approval: 'Approbation',
      share: 'Partage',
      delete: 'Archivage',
      scan: 'Numérisation',
      edit: 'Modification',
      download: 'Téléchargement'
    };
    return labels?.[type] || 'Activité';
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Icon name="Activity" size={18} color="white" />
            </div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Activité Récente</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="ExternalLink"
            iconPosition="right"
            iconSize={14}
            onClick={() => window.location.href = '/activity-log'}
            className="text-muted-foreground hover:text-foreground font-body"
          >
            Voir tout
          </Button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {displayActivities?.slice(0, 8)?.map((activity, index) => (
          <div 
            key={activity?.id} 
            className={`p-4 hover:bg-muted transition-colors duration-200 ${
              index !== displayActivities?.slice(0, 8)?.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-10 h-10 ${activity?.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                <Icon name={activity?.icon} size={16} color="white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-body font-medium text-foreground truncate">
                    {activity?.title}
                  </h4>
                  <span className="text-xs text-muted-foreground font-caption flex-shrink-0 ml-2">
                    {formatTimestamp(activity?.timestamp)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground font-body mb-2 line-clamp-2">
                  {activity?.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-caption">
                    Par {activity?.user}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-caption ${
                    activity?.type === 'approval' ? 'bg-orange-100 text-orange-800' :
                    activity?.type === 'upload' ? 'bg-green-100 text-green-800' :
                    activity?.type === 'access' ? 'bg-blue-100 text-blue-800' :
                    activity?.type === 'share'? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getActivityTypeLabel(activity?.type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {displayActivities?.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="Clock" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-heading font-medium text-foreground mb-2">
            Aucune activité récente
          </h3>
          <p className="text-muted-foreground font-body">
            Les activités récentes apparaîtront ici
          </p>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;