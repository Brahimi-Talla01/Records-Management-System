import React from 'react';
import Icon from '../../../components/AppIcon';

const StatsOverview = ({ userRole, stats }) => {
  const getStatsForRole = () => {
    switch (userRole) {
      case 'admin':
        return [
          {
            id: 'total_documents',
            label: 'Documents Totaux',
            value: stats?.totalDocuments || '12,847',
            change: '+5.2%',
            changeType: 'positive',
            icon: 'FileText',
            color: 'bg-blue-500'
          },
          {
            id: 'pending_approvals',
            label: 'Approbations en Attente',
            value: stats?.pendingApprovals || '23',
            change: '-12%',
            changeType: 'negative',
            icon: 'Clock',
            color: 'bg-orange-500'
          },
          {
            id: 'active_users',
            label: 'Utilisateurs Actifs',
            value: stats?.activeUsers || '1,247',
            change: '+8.1%',
            changeType: 'positive',
            icon: 'Users',
            color: 'bg-green-500'
          },
          {
            id: 'storage_used',
            label: 'Stockage Utilisé',
            value: stats?.storageUsed || '2.4 TB',
            change: '+15%',
            changeType: 'neutral',
            icon: 'HardDrive',
            color: 'bg-purple-500'
          }
        ];
      case 'teacher':
        return [
          {
            id: 'my_documents',
            label: 'Mes Documents',
            value: stats?.myDocuments || '156',
            change: '+3',
            changeType: 'positive',
            icon: 'FileText',
            color: 'bg-blue-500'
          },
          {
            id: 'shared_documents',
            label: 'Documents Partagés',
            value: stats?.sharedDocuments || '42',
            change: '+7',
            changeType: 'positive',
            icon: 'Share2',
            color: 'bg-green-500'
          },
          {
            id: 'thesis_submissions',
            label: 'Thèses Soumises',
            value: stats?.thesisSubmissions || '8',
            change: '+2',
            changeType: 'positive',
            icon: 'GraduationCap',
            color: 'bg-purple-500'
          }
        ];
      case 'student':
        return [
          {
            id: 'accessible_documents',
            label: 'Documents Accessibles',
            value: stats?.accessibleDocuments || '89',
            change: '+12',
            changeType: 'positive',
            icon: 'Eye',
            color: 'bg-blue-500'
          },
          {
            id: 'downloaded_documents',
            label: 'Documents Téléchargés',
            value: stats?.downloadedDocuments || '34',
            change: '+5',
            changeType: 'positive',
            icon: 'Download',
            color: 'bg-green-500'
          },
          {
            id: 'my_submissions',
            label: 'Mes Soumissions',
            value: stats?.mySubmissions || '3',
            change: '0',
            changeType: 'neutral',
            icon: 'Upload',
            color: 'bg-orange-500'
          }
        ];
      default:
        return [
          {
            id: 'processed_documents',
            label: 'Documents Traités',
            value: stats?.processedDocuments || '234',
            change: '+18',
            changeType: 'positive',
            icon: 'CheckCircle',
            color: 'bg-green-500'
          },
          {
            id: 'pending_documents',
            label: 'En Attente',
            value: stats?.pendingDocuments || '12',
            change: '-3',
            changeType: 'negative',
            icon: 'Clock',
            color: 'bg-orange-500'
          },
          {
            id: 'department_documents',
            label: 'Documents Département',
            value: stats?.departmentDocuments || '567',
            change: '+25',
            changeType: 'positive',
            icon: 'Building',
            color: 'bg-blue-500'
          }
        ];
    }
  };

  const statsData = getStatsForRole();

  const getChangeColor = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'TrendingUp';
      case 'negative':
        return 'TrendingDown';
      default:
        return 'Minus';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {statsData?.map((stat) => (
        <div key={stat?.id} className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${stat?.color} rounded-lg flex items-center justify-center`}>
              <Icon name={stat?.icon} size={24} color="white" />
            </div>
            <div className={`flex items-center space-x-1 ${getChangeColor(stat?.changeType)}`}>
              <Icon name={getChangeIcon(stat?.changeType)} size={16} />
              <span className="text-sm font-caption font-medium">{stat?.change}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-heading font-bold text-foreground mb-1">
              {stat?.value}
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              {stat?.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;