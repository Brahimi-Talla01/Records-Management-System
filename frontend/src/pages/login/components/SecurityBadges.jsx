import Icon from '../../../components/AppIcon';

const SecurityBadges = () => {
  const badges = [
    {
      id: 1,
      icon: 'Shield',
      title: 'RGPD Conforme',
      description: 'Protection des données personnelles'
    },
    {
      id: 2,
      icon: 'Lock',
      title: 'Chiffrement SSL',
      description: 'Connexion sécurisée'
    },
    {
      id: 3,
      icon: 'Award',
      title: 'Certifié Université',
      description: 'Standards académiques'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 mt-8">
      {badges?.map((badge) => (
        <div
          key={badge?.id}
          className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border border-border"
        >
          <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Icon name={badge?.icon} size={16} className="text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-body font-medium text-foreground">
              {badge?.title}
            </p>
            <p className="text-xs text-muted-foreground font-caption">
              {badge?.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SecurityBadges;