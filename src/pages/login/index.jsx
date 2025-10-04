import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import TwoFactorAuth from './components/TwoFactorAuth';
import LanguageSelector from './components/LanguageSelector';
import SecurityBadges from './components/SecurityBadges';
import UniversityBranding from './components/UniversityBranding';
import Icon from '../../components/AppIcon';

const Login = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('2fa'); // 'login' or '2fa'
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [error, setError] = useState('');

  // Mock credentials for different user types
  const mockCredentials = {
    admin: { username: 'brahimi@gmail.com', password: 'Admin123!' },
    teacher: { username: 'prof.martin@univ-paris.fr', password: 'Prof2024!' },
    student: { username: 'etudiant.dupont@etu.univ-paris.fr', password: 'Etud2024!' },
    staff: { username: 'secretaire@univ-paris.fr', password: 'Staff2024!' }
  };

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
    }

    // Check if user is already authenticated
    const token = localStorage.getItem('auth-token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    // Handle account lockout timer
    if (isLocked && lockTimeLeft > 0) {
      const timer = setTimeout(() => setLockTimeLeft(lockTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimeLeft === 0) {
      setIsLocked(false);
      setLoginAttempts(0);
      setError('');
    }
  }, [isLocked, lockTimeLeft]);

  const handleLogin = async (formData) => {
    if (isLocked) {
      setError(`Compte verrouillé. Réessayez dans ${lockTimeLeft} secondes.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check credentials against mock data
      const isValidCredential = Object.values(mockCredentials)?.some(
        cred => cred?.username === formData?.username && cred?.password === formData?.password
      );

      if (isValidCredential) {
        // Determine user role based on email domain/prefix
        let userRole = 'student';
        if (formData?.username?.includes('admin')) userRole = 'admin';
        else if (formData?.username?.includes('prof')) userRole = 'teacher';
        else if (formData?.username?.includes('secretaire')) userRole = 'staff';

        // Mock user data
        const userData = {
          id: Math.random()?.toString(36)?.substr(2, 9),
          name: userRole === 'admin' ? 'Administrateur Système' :
                userRole === 'teacher' ? 'Prof. Mbarga Samuel' :
                userRole === 'staff'? 'Malla Secrétaire' : 'Étudiant Ngono',
          email: formData?.username,
          role: userRole,
          department: userRole === 'teacher' ? 'Informatique' : 
                     userRole === 'staff' ? 'Administration' : 
                     userRole === 'student' ? 'Master Informatique' : 'IT',
          avatar: `https://randomuser.me/api/portraits/${userRole === 'admin' || userRole === 'teacher' ? 'men' : 'women'}/${Math.floor(Math.random() * 50) + 1}.jpg`,
          lastLogin: new Date()?.toISOString(),
          preferences: {
            language: currentLanguage,
            theme: 'light',
            notifications: true
          }
        };

        // Store auth data
        localStorage.setItem('auth-token', 'mock-jwt-token-' + Date.now());
        localStorage.setItem('user-data', JSON.stringify(userData));

        // Reset login attempts
        setLoginAttempts(0);

        // Simulate 2FA requirement for admin and teacher roles
        if (userRole === 'admin' || userRole === 'teacher') {
          setCurrentStep('2fa');
        } else {
          // Direct login for students and staff
          navigate('/dashboard');
        }
      } else {
        // Invalid credentials
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimeLeft(300); // 5 minutes lockout
          setError('Trop de tentatives échouées. Compte verrouillé pour 5 minutes.');
        } else {
          setError(`Identifiants incorrects. ${3 - newAttempts} tentative(s) restante(s).`);
        }
      }
    } catch (error) {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorVerify = async (code) => {
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock verification (accept 123456 as valid code)
      if (code === '123456') {
        navigate('/dashboard');
      } else {
        setError('Code de vérification incorrect. Utilisez 123456 pour la démonstration.');
      }
    } catch (error) {
      setError('Erreur de vérification. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    // Mock resend functionality
    console.log('Code de vérification renvoyé');
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
  };

  const formatLockTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds?.toString()?.padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Language Selector */}
        <div className="flex justify-end mb-6">
          <LanguageSelector 
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {/* Main Login Card */}
        <div className="bg-card border border-border rounded-xl shadow-modal p-8">
          {/* University Branding */}
          <UniversityBranding />

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-error" />
                <p className="text-sm font-body text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Account Lockout Warning */}
          {isLocked && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="Lock" size={16} className="text-warning" />
                <div>
                  <p className="text-sm font-body text-warning font-medium">
                    Compte temporairement verrouillé
                  </p>
                  <p className="text-xs text-warning/80 font-caption">
                    Temps restant: {formatLockTime(lockTimeLeft)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Login Steps */}
          <div className="mt-8">
            {currentStep === 'login' ? (
              <LoginForm 
                onLogin={handleLogin}
                isLoading={isLoading}
              />
            ) : (
              <TwoFactorAuth
                onVerify={handleTwoFactorVerify}
                onResend={handleResendCode}
                onBack={() => setCurrentStep('login')}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Demo Credentials Info */}
          {currentStep === 'login' && !isLocked && (
            <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
              <div className="flex items-start space-x-2">
                <Icon name="Info" size={16} className="text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-body font-medium text-foreground mb-2">
                    Comptes de démonstration:
                  </p>
                  <div className="space-y-1 text-xs font-caption text-muted-foreground">
                    <p><strong>Admin:</strong> brahimi@gmail.com / Admin123!</p>
                    <p><strong>Professeur:</strong> prof.martin@univ-paris.fr / Prof2024!</p>
                    <p><strong>Étudiant:</strong> etudiant.dupont@etu.univ-paris.fr / Etud2024!</p>
                    <p><strong>Personnel:</strong> secretaire@univ-paris.fr / Staff2024!</p>
                  </div>
                  {currentStep === '2fa' && (
                    <p className="text-xs font-caption text-accent mt-2">
                      Code 2FA: <strong>123456</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Badges */}
          <SecurityBadges />

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground font-caption">
              © {new Date()?.getFullYear()} Université de Douala. Tous droits réservés.
            </p>
            <div className="flex items-center justify-center space-x-4 mt-2">
              <button className="text-xs text-muted-foreground hover:text-foreground font-caption transition-colors">
                Politique de confidentialité
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-xs text-muted-foreground hover:text-foreground font-caption transition-colors">
                Conditions d'utilisation
              </button>
              <span className="text-muted-foreground">•</span>
              <button className="text-xs text-muted-foreground hover:text-foreground font-caption transition-colors">
                Support technique
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;