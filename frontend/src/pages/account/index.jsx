import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ProfileCard from './components/ProfileCard';
import ChangePasswordCard from './components/ChangePasswordCard';
import TwoFactorCard from './components/TwoFactorCard';
import DevicesCard from './components/DevicesCard';
import SecurityAlertsCard from './components/SecurityAlertsCard';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';

/**
 * Écran « Mon compte » : profil, mot de passe, 2FA, appareils et alertes.
 * Toutes les données viennent des hooks du domaine auth (aucun axios ici).
 */
const Account = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const headerUser = user
    ? {
        name: user.full_name || user.username,
        role: mapBackendRole(user.role?.name),
        email: user.email,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={() => navigate('/login')} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Breadcrumb />
          <div className="mb-8 mt-4">
            <h1 className="text-3xl font-heading font-bold text-foreground">Mon compte</h1>
            <p className="mt-2 font-body text-muted-foreground">
              Gérez votre profil, votre mot de passe, la double authentification et vos appareils.
            </p>
          </div>

          <div className="space-y-6">
            <ProfileCard user={user} />

            <div className="grid gap-6 lg:grid-cols-2">
              <ChangePasswordCard />
              <TwoFactorCard enabled={!!user?.two_fa_enabled} />
            </div>

            <DevicesCard />
            <SecurityAlertsCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Account;
