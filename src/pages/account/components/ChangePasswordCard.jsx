import { useState } from 'react';
import Card, { CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { useChangePassword } from '../../../features/auth';
import { useToast } from '../../../components/ui/useToast';
import { toAppError } from '../../../lib/errors';
import { passwordSchema } from '../../../lib/validate';

/** Première erreur zod d'un champ (message court, prêt pour `Input.error`). */
const firstError = (result) => result.error.issues[0]?.message;

const EMPTY = { current: '', next: '', confirm: '' };

/**
 * Changement de mot de passe du compte connecté.
 * La validation locale reprend les règles serveur (8 car., maj., min., chiffre)
 * pour un retour immédiat ; le backend reste l'autorité.
 */
const ChangePasswordCard = () => {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const changePassword = useChangePassword();
  const toast = useToast();

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!values.current) nextErrors.current = 'Mot de passe actuel requis';
    const parsed = passwordSchema.safeParse(values.next);
    if (!parsed.success) nextErrors.next = firstError(parsed);
    if (values.confirm !== values.next) nextErrors.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    changePassword.mutate(
      { currentPassword: values.current, newPassword: values.next },
      {
        onSuccess: () => {
          toast.success('Mot de passe changé avec succès.');
          setValues(EMPTY);
          setErrors({});
        },
        onError: (err) => {
          const appError = toAppError(err);
          // 401 = mauvais mot de passe actuel : on l'attache au champ concerné.
          if (appError.status === 401) {
            setErrors({ current: 'Mot de passe actuel incorrect' });
            return;
          }
          toast.error(appError.message);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name="Lock" size={18} className="text-primary" />
          <CardTitle>Mot de passe</CardTitle>
        </div>
        <p className="text-sm font-body text-muted-foreground">
          Au moins 8 caractères, une majuscule, une minuscule et un chiffre.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            type="password"
            label="Mot de passe actuel"
            autoComplete="current-password"
            value={values.current}
            onChange={setField('current')}
            error={errors.current}
            required
          />
          <Input
            type="password"
            label="Nouveau mot de passe"
            autoComplete="new-password"
            value={values.next}
            onChange={setField('next')}
            error={errors.next}
            required
          />
          <Input
            type="password"
            label="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            value={values.confirm}
            onChange={setField('confirm')}
            error={errors.confirm}
            required
          />
          <Button
            type="submit"
            iconName="Save"
            iconPosition="left"
            loading={changePassword.isPending}
          >
            Changer le mot de passe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
