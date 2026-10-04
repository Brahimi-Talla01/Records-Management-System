import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useResetPassword } from '../../features/auth';
import { useToast } from '../../components/ui/useToast';
import { toAppError } from '../../lib/errors';
import { passwordSchema } from '../../lib/validate';

const firstError = (result) => result.error.issues[0]?.message;

/**
 * Finalisation du lien de réinitialisation : `/reset-password?token=…`.
 * Route publique (hors session) : le token fait office d'autorisation.
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [values, setValues] = useState({ next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const resetPassword = useResetPassword();
  const toast = useToast();
  const navigate = useNavigate();

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const parsed = passwordSchema.safeParse(values.next);
    if (!parsed.success) nextErrors.next = firstError(parsed);
    if (values.confirm !== values.next) nextErrors.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    resetPassword.mutate(
      { token, newPassword: values.next },
      {
        onSuccess: () => {
          toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
          navigate('/login', { replace: true });
        },
        onError: (err) => {
          const appError = toAppError(err);
          if (appError.status === 400) {
            setErrors({ next: appError.message });
            return;
          }
          toast.error(appError.message);
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon name="Lock" size={18} className="text-primary" />
              <CardTitle>Réinitialiser le mot de passe</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-error/40 bg-error/10 p-3">
                  <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-error" />
                  <p className="text-sm font-body text-foreground">
                    Lien invalide : aucun jeton de réinitialisation n'a été fourni.
                  </p>
                </div>
                <Button asChild variant="outline" fullWidth>
                  <Link to="/login">Retour à la connexion</Link>
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <p className="text-sm font-body text-muted-foreground">
                  Choisissez un nouveau mot de passe robuste : 8 caractères minimum, avec
                  majuscule, minuscule et chiffre.
                </p>
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
                  label="Confirmer le mot de passe"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={setField('confirm')}
                  error={errors.confirm}
                  required
                />
                <Button
                  type="submit"
                  fullWidth
                  iconName="Save"
                  iconPosition="left"
                  loading={resetPassword.isPending}
                >
                  Réinitialiser
                </Button>
                <Button asChild variant="ghost" fullWidth>
                  <Link to="/login">Retour à la connexion</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
