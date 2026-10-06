/**
 * Aide & Support (tableau de bord) — entrée unique vers les ressources
 * d'accompagnement.
 *
 * Chaque entrée ouvre une modale réellement utile (aucun lien mort) :
 *  - « Guide d'utilisation » : démarrage rapide en 4 étapes ;
 *  - « Contacter le support » : coordonnées de l'établissement (API publique)
 *    + lien mailto, avec repli si elles ne sont pas renseignées ;
 *  - « Tutoriels » : parcours guidés qui ouvrent l'écran concerné.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Modal from '../../../components/ui/Modal';
import { useInstitution } from '../../../features/campuses';

const GUIDE_STEPS = [
  {
    title: 'Déposer un document',
    text: 'Depuis « Télécharger », ajoutez un fichier, renseignez les métadonnées (type, département, confidentialité) puis validez.',
  },
  {
    title: 'Retrouver vos archives',
    text: 'La « Bibliothèque » liste les documents : filtrez par type, département ou étiquette, et basculez entre vue lignes et vue grille.',
  },
  {
    title: 'Rechercher finement',
    text: 'La « Recherche » interroge le titre, la description et le contenu (OCR) avec des filtres de dates et de confidentialité.',
  },
  {
    title: 'Administrer (rôles Admin)',
    text: 'L’espace « Administration » réunit les comptes, les référentiels, les réglages, l’audit et la rétention.',
  },
];

const TUTORIALS = [
  {
    icon: 'Upload',
    title: 'Déposer et indexer un document',
    text: 'Parcours guidé du dépôt : fichier, métadonnées, version.',
    path: '/document-upload',
  },
  {
    icon: 'Search',
    title: 'Rechercher dans les archives',
    text: 'Mots-clés, filtres et facettes pour retrouver un document.',
    path: '/advanced-search',
  },
  {
    icon: 'FolderOpen',
    title: 'Parcourir la bibliothèque',
    text: 'Dossiers, filtres et vues lignes/grille.',
    path: '/document-library',
  },
  {
    icon: 'Users',
    title: 'Gérer les comptes utilisateurs',
    text: 'Création, import CSV, rôles et périmètre campus.',
    path: '/user-management',
  },
];

const HelpSupportCard = () => {
  const navigate = useNavigate();
  const institutionQuery = useInstitution();
  const [topic, setTopic] = useState(null);

  const institution = institutionQuery.data;
  const supportEmail = institution?.email;
  const close = () => setTopic(null);

  const openTutorial = (path) => {
    close();
    navigate(path);
  };

  const modalTitles = {
    guide: "Guide d'utilisation",
    support: 'Contacter le support',
    tutorials: 'Tutoriels',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-info rounded-lg flex items-center justify-center">
          <Icon name="HelpCircle" size={18} className="text-info-foreground" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground">Aide &amp; Support</h3>
      </div>

      <div className="space-y-3">
        <Button
          variant="ghost"
          iconName="Book"
          iconPosition="left"
          iconSize={16}
          fullWidth
          onClick={() => setTopic('guide')}
          className="justify-start font-body"
        >
          Guide d'utilisation
        </Button>
        <Button
          variant="ghost"
          iconName="MessageCircle"
          iconPosition="left"
          iconSize={16}
          fullWidth
          onClick={() => setTopic('support')}
          className="justify-start font-body"
        >
          Contacter le support
        </Button>
        <Button
          variant="ghost"
          iconName="Video"
          iconPosition="left"
          iconSize={16}
          fullWidth
          onClick={() => setTopic('tutorials')}
          className="justify-start font-body"
        >
          Tutoriels vidéo
        </Button>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="bg-info/10 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Icon name="Info" size={16} className="text-info mt-0.5" />
            <div>
              <p className="text-sm font-body text-info mb-1">Nouveau dans UniArchive ?</p>
              <p className="text-xs text-info font-caption">
                Consultez notre guide de démarrage rapide pour bien commencer.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(topic)}
        onClose={close}
        title={topic ? modalTitles[topic] : ''}
        footer={
          <Button variant="outline" onClick={close}>
            Fermer
          </Button>
        }
      >
        {topic === 'guide' && (
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
        )}

        {topic === 'support' && (
          <div className="space-y-4">
            <p className="text-sm font-body text-muted-foreground">
              Pour toute question sur vos accès ou un dysfonctionnement, contactez
              l’administration de votre établissement.
            </p>

            {institutionQuery.isLoading ? (
              <p className="text-sm font-body text-muted-foreground">Chargement des coordonnées…</p>
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

            {supportEmail ? (
              <Button asChild variant="default" iconName="Send" iconPosition="left" iconSize={16}>
                <a href={`mailto:${supportEmail}`}>Écrire au support</a>
              </Button>
            ) : (
              <p className="text-sm font-body text-muted-foreground">
                Aucune adresse de support n’est renseignée : adressez-vous directement à un
                administrateur de la plateforme.
              </p>
            )}
          </div>
        )}

        {topic === 'tutorials' && (
          <ul className="space-y-3">
            {TUTORIALS.map((tutorial) => (
              <li
                key={tutorial.path}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
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
                  onClick={() => openTutorial(tutorial.path)}
                  aria-label={`Ouvrir le tutoriel « ${tutorial.title} »`}
                >
                  Ouvrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};

export default HelpSupportCard;
