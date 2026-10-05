import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Icon from '../components/AppIcon';

/** Page 403 : accès refusé (rôle ou périmètre campus insuffisant). */
const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <h1 className="text-9xl font-bold text-error opacity-20">403</h1>
        </div>

        <h2 className="text-2xl font-medium text-foreground mb-2">Accès refusé</h2>
        <p className="text-muted-foreground mb-8">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => window.history?.back()}
          >
            Retour
          </Button>

          <Button
            variant="default"
            iconName="Home"
            iconPosition="left"
            onClick={() => navigate('/dashboard')}
          >
            Tableau de bord
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
