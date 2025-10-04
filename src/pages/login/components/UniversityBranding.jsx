import React from 'react';
import Icon from '../../../components/AppIcon';

const UniversityBranding = () => {
  return (
    <div className="text-center space-y-4">
      {/* University Logo */}
      <div className="flex items-center justify-center space-x-3">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
          <Icon name="GraduationCap" size={28} color="white" />
        </div>
        <div className="text-left">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            UniArchive
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Système de gestion documentaire
          </p>
        </div>
      </div>

      {/* University Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Icon name="MapPin" size={16} className="text-muted-foreground" />
          <span className="text-sm font-body text-muted-foreground">
            Université de Douala - Campus Numérique
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-caption">
          Plateforme sécurisée pour la gestion et l'archivage des documents universitaires
        </p>
      </div>

      {/* Trust Indicators */}
      <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground font-caption">
        <div className="flex items-center space-x-1">
          <Icon name="Users" size={12} />
          <span>15,000+ utilisateurs</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="FileText" size={12} />
          <span>2M+ documents</span>
        </div>
        <div className="flex items-center space-x-1">
          <Icon name="Clock" size={12} />
          <span>24/7 disponible</span>
        </div>
      </div>
    </div>
  );
};

export default UniversityBranding;