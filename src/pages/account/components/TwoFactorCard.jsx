import { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/AppIcon';
import { useEnable2FA, useConfirm2FA, useDisable2FA } from '../../../features/auth';
import { useToast } from '../../../components/ui/useToast';
import { useConfirm } from '../../../components/ui/useConfirm';
import { toAppError } from '../../../lib/errors';

/**
 * Activation / désactivation de la 2FA.
 * Flux d'activation en deux temps : `enable` envoie un code, `confirm` le valide.
 * Un email ne pouvant être exigé en environnement de démo, la console serveur
 * affiche le code (cf. README backend).
 */
const TwoFactorCard = ({ enabled = false }) => {
  const [step, setStep] = useState('idle'); // 'idle' | 'confirm'
  const [code, setCode] = useState('');

  const enable2FA = useEnable2FA();
  const confirm2FA = useConfirm2FA();
  const disable2FA = useDisable2FA();
  const toast = useToast();
  const confirm = useConfirm();

  const handleEnable = () => {
    enable2FA.mutate(undefined, {
      onSuccess: () => {
        setStep('confirm');
        toast.info('Un code de vérification a été envoyé par email.');
      },
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  const handleConfirm = (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    confirm2FA.mutate(code.trim(), {
      onSuccess: () => {
        toast.success('Double authentification activée.');
        setStep('idle');
        setCode('');
      },
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  const handleDisable = async () => {
    const ok = await confirm({
      title: 'Désactiver la double authentification',
      description:
        'Votre compte ne sera plus protégé par un code envoyé par email. Continuer ?',
      confirmLabel: 'Désactiver',
    });
    if (!ok) return;
    disable2FA.mutate(undefined, {
      onSuccess: () => toast.success('Double authentification désactivée.'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon name="ShieldCheck" size={18} className="text-primary" />
          <CardTitle>Double authentification</CardTitle>
        </div>
        <Badge variant={enabled ? 'success' : 'neutral'}>
          {enabled ? 'Activée' : 'Désactivée'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-body text-muted-foreground">
          À chaque connexion, un code de vérification est envoyé par email. L'activation
          ajoute cette étape à la saisie du mot de passe.
        </p>

        {!enabled && step === 'idle' && (
          <Button iconName="Shield" iconPosition="left" onClick={handleEnable} loading={enable2FA.isPending}>
            Activer la 2FA
          </Button>
        )}

        {!enabled && step === 'confirm' && (
          <form className="space-y-4" onSubmit={handleConfirm}>
            <Input
              label="Code de vérification"
              description="Code à 6 chiffres reçu par email (affiché dans la console du serveur en développement)."
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" iconName="Check" iconPosition="left" loading={confirm2FA.isPending}>
                Confirmer le code
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('idle');
                  setCode('');
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}

        {enabled && (
          <Button
            variant="danger"
            iconName="Shield"
            iconPosition="left"
            onClick={handleDisable}
            loading={disable2FA.isPending}
          >
            Désactiver la 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorCard;
