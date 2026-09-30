import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const ForgotPassword = ({ onBack, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }

    if (!validateEmail(email)) {
      setError('Veuillez entrer un email valide');
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <Icon name="Check" size={32} className="text-success" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            Email envoyé !
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.
          </p>
          <p className="text-xs text-muted-foreground font-caption">
            Vérifiez également votre dossier spam.
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          size="lg"
          fullWidth
          onClick={onBack}
          iconName="ArrowLeft"
          iconPosition="left"
          iconSize={20}
        >
          Retour à la connexion
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="Key" size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground">
          Mot de passe oublié ?
        </h3>
        <p className="text-sm text-muted-foreground font-body">
          Entrez votre adresse email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Adresse email"
          type="email"
          placeholder="votre.email@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          error={error}
          required
          disabled={isLoading}
          className="w-full"
        />

        <div className="space-y-3">
          <Button
            type="submit"
            variant="default"
            size="lg"
            fullWidth
            loading={isLoading}
            iconName="Send"
            iconPosition="left"
            iconSize={20}
          >
            Envoyer le lien
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={onBack}
            disabled={isLoading}
            iconName="ArrowLeft"
            iconPosition="left"
            iconSize={20}
          >
            Retour
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;