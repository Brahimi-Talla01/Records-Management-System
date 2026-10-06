/**
 * Centre d'aide (`/help`).
 *
 * Rend le guide de démarrage, les tutoriels et les coordonnées de support
 * hors du tableau de bord, et donc accessibles depuis la navigation de
 * n'importe quelle page. Le contenu provient de `lib/help` (source unique) ;
 * les coordonnées de support viennent de l'API publique `GET /institution`.
 */
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../features/auth';
import { useInstitution } from '../../features/campuses';
import { mapBackendRole } from '../../lib/formatters';
import { GUIDE_STEPS, TUTORIALS } from '../../lib/help';

const Help = () => {
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const institutionQuery = useInstitution();

  const institution = institutionQuery.data;
  const supportEmail = institution?.email;

  const headerUser = me
    ? {
        name: me.full_name || me.username,
        role: mapBackendRole(me.role?.name),
        email: me.email,
      }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte côté serveur
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground">Centre d'aide</h1>
            <p className="font-body text-muted-foreground mt-2">
              Guide de démarrage, tutoriels et contact du support.
            </p>
          </div>

          <div className="space-y-6">
            {/* Guide de démarrage */}
            <section
              id="guide"
              className="bg-card border border-border rounded-lg p-6 shadow-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Book" size={18} className="text-primary-foreground" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-foreground">
                  Guide de démarrage
                </h2>
              </div>

              <ol className="space-y-4">
                {GUIDE_STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-heading font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-body font-medium text-foreground">{step.title}</p>
                      <p className="text-sm font-body text-muted-foreground">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Tutoriels */}
            <section
              id="tutoriels"
              className="bg-card border border-border rounded-lg p-6 shadow-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Icon name="Video" size={18} className="text-accent-foreground" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-foreground">Tutoriels</h2>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TUTORIALS.map((tutorial) => (
                  <li
                    key={tutorial.path}
                    className="flex items-start gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center shrink-0">
                      <Icon name={tutorial.icon} size={16} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body font-medium text-foreground">{tutorial.title}</p>
                      <p className="text-sm font-body text-muted-foreground">{tutorial.text}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="Play"
                      iconPosition="left"
                      iconSize={14}
                      onClick={() => navigate(tutorial.path)}
                      aria-label={`Ouvrir le tutoriel « ${tutorial.title} »`}
                    >
                      Ouvrir
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Contacter le support */}
            <section
              id="support"
              className="bg-card border border-border rounded-lg p-6 shadow-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-info rounded-lg flex items-center justify-center">
                  <Icon name="MessageCircle" size={18} className="text-info-foreground" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-foreground">
                  Contacter le support
                </h2>
              </div>

              <p className="text-sm font-body text-muted-foreground mb-4">
                Pour toute question sur vos accès ou un dysfonctionnement, contactez
                l’administration de votre établissement.
              </p>

              {institutionQuery.isLoading ? (
                <p className="text-sm font-body text-muted-foreground">
                  Chargement des coordonnées…
                </p>
              ) : (
                <ul className="space-y-3">
                  {institution?.name && (
                    <li className="flex items-center gap-3 text-sm font-body text-foreground">
                      <Icon name="Building" size={16} className="text-muted-foreground" />
                      {institution.name}
                    </li>
                  )}
                  {supportEmail && (
                    <li className="flex items-center gap-3 text-sm font-body text-foreground">
                      <Icon name="Send" size={16} className="text-muted-foreground" />
                      <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                        {supportEmail}
                      </a>
                    </li>
                  )}
                  {institution?.phone && (
                    <li className="flex items-center gap-3 text-sm font-body text-foreground">
                      <Icon name="MessageCircle" size={16} className="text-muted-foreground" />
                      {institution.phone}
                    </li>
                  )}
                </ul>
              )}

              {supportEmail && (
                <div className="mt-4">
                  <Button
                    asChild
                    variant="default"
                    iconName="Send"
                    iconPosition="left"
                    iconSize={16}
                  >
                    <a href={`mailto:${supportEmail}`}>Écrire au support</a>
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;
