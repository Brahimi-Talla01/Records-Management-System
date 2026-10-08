import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import TwoFactorAuth from './components/TwoFactorAuth';
import LanguageSelector from './components/LanguageSelector';
import SecurityBadges from './components/SecurityBadges';
import UniversityBranding from './components/UniversityBranding';
import Icon from '../../components/AppIcon';
import { useAuth, authApi } from '../../features/auth';
import ForgotPassword from './components/ForgotPassword';

const Login = () => {
  const navigate = useNavigate();
  const { login, verify2FA, isAuthenticated, status } = useAuth();
  const [currentStep, setCurrentStep] = useState('login'); // 'login' | '2fa' | 'forgot-password'
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  // Session déjà active → dashboard (une fois le statut connu)
  useEffect(() => {
    if (status !== 'loading' && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [status, isAuthenticated, navigate]);

  // Redirection uniquement après vérification 2FA réussie (session posée).
  // Le login seul ne redirige PAS : le backend ne fait que renvoyer
  // { requires_2fa, user_id } sans cookie — si on naviguait sur /dashboard,
  // ProtectedRoute renverrait immédiatement sur /login (401 sur /auth/me).
  useEffect(() => {
    if (verify2FA.isSuccess) {
      navigate('/dashboard');
    }
  }, [verify2FA.isSuccess, navigate]);

  const handleLogin = (formData) => {
    setError('');
    login.mutate(
      { username: formData.username, password: formData.password },
      {
        onSuccess: (data) => {
          if (data?.requires_2fa) {
            // Étape 1 validée : on stocke l'ID utilisateur et on affiche
            // l'écran de saisie du code (le backend vient de l'envoyer par email).
            setUserId(data.user_id);
            setCurrentStep('2fa');
          }
          // sinon (2FA désactivée) : useAuth.login a déjà posé le store,
          // l'effet ci-dessus redirige automatiquement vers /dashboard.
        },
        onError: (err) => {
          setError(err.response?.data?.error || err.message || 'Identifiants incorrects');
        },
      }
    );
  };

  const handleTwoFactorVerify = (code) => {
    setError('');
    verify2FA.mutate(
      { userId, code },
      {
        onError: (err) => {
          setError(err.response?.data?.error || err.message || 'Code de vérification incorrect');
        },
      }
    );
  };

  const handleResendCode = async () => {
    // Renvoi du code : on relance le login (le backend régénère et renvoie un code)
    if (login.variables?.username && login.variables?.password) {
      login.mutate(login.variables);
    }
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    localStorage.setItem('preferred-language', language);
  };

  const handleForgotPassword = async (email) => {
    try {
      await authApi.forgotPassword(email);
      setCurrentStep('login');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi de l\'email');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-6">
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <div className="bg-card border border-border rounded-xl shadow-modal p-8">
          <UniversityBranding />

          {error && (
            <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-error" />
                <p className="text-sm font-body text-error">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-8">
            {currentStep === 'login' && (              <LoginForm
                onLogin={handleLogin}
                onForgotPassword={() => setCurrentStep('forgot-password')}
                isLoading={login.isPending}
              />
            )}

            {currentStep === '2fa' && (
              <TwoFactorAuth
                onVerify={handleTwoFactorVerify}
                onResend={handleResendCode}
                onBack={() => setCurrentStep('login')}
                isLoading={verify2FA.isPending}
              />
            )}

            {currentStep === 'forgot-password' && (
              <ForgotPassword
                onSubmit={handleForgotPassword}
                onBack={() => setCurrentStep('login')}
              />
            )}
          </div>

          {currentStep === 'login' && (
            <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
              <div className="flex items-start space-x-2">
                <Icon name="Info" size={16} className="text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-body font-medium text-foreground mb-2">
                    Sécurité :
                  </p>
                  <div className="space-y-1 text-xs font-caption text-muted-foreground">
                    <p>Vos accès sont protégés par une vérification en deux étapes (code envoyé par email).</p>
                    <p>En cas de perte d'accès, contactez l'administrateur de votre établissement.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SecurityBadges />

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground font-caption">
              © {new Date().getFullYear()} Université de Douala. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
