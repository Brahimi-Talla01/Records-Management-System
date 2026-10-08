import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

/** Page 404 : route inconnue. */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <h1 className="text-9xl font-bold text-primary opacity-20">404</h1>
        </div>

        <h2 className="text-2xl font-medium text-foreground mb-2">Page introuvable</h2>
        <p className="text-muted-foreground mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
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

export default NotFound;
