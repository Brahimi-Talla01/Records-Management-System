/**
 * Pied de page du tableau de bord.
 *
 * Les liens légaux ne sont plus inertes : chacun ouvre une modale présentant
 * le texte correspondant (confidentialité, conditions d'utilisation). Le
 * contenu décrit le fonctionnement réel de la plateforme (sessions, 2FA,
 * journal d'audit, rétention, niveaux de confidentialité).
 */
import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Modal from '../../../components/ui/Modal';

const LEGAL_DOCUMENTS = {
  privacy: {
    title: 'Politique de confidentialité',
    intro:
      'Cette politique décrit les données traitées par UniArchive dans le cadre de la gestion documentaire de l’établissement.',
    sections: [
      {
        heading: 'Données traitées',
        body: 'Compte (nom complet, nom d’utilisateur, email, matricule, rôle, département, campus), journal d’audit des actions, sessions (horodatage, adresse IP, agent) et documents déposés avec leurs métadonnées.',
      },
      {
        heading: 'Finalités',
        body: 'Assurer la gestion, l’archivage et la recherche des documents universitaires, garantir la sécurité et la traçabilité des accès, et produire les statistiques d’usage de la plateforme.',
      },
      {
        heading: 'Conservation',
        body: 'Les documents suivent la durée de rétention définie par l’établissement (par type de document et par campus). Les journaux d’audit et de session sont conservés le temps nécessaire à la sécurité et à la conformité.',
      },
      {
        heading: 'Sécurité',
        body: 'Sessions opaques avec cookies HTTPOnly, authentification à deux facteurs obligatoire, contrôle des accès par rôle et par périmètre de campus, chiffrement du stockage des fichiers.',
      },
      {
        heading: 'Vos droits',
        body: 'Vous pouvez demander l’accès, la rectification ou la suppression de vos données en contactant l’administration de votre établissement.',
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    intro:
      'En accédant à UniArchive, vous acceptez les conditions ci-dessous, applicables à tout compte autorisé.',
    sections: [
      {
        heading: 'Objet',
        body: 'UniArchive permet de déposer, classer, rechercher et archiver les documents de l’établissement dans le respect de la réglementation en vigueur.',
      },
      {
        heading: 'Comptes et accès',
        body: 'Les identifiants sont personnels et non transférables. La double authentification est obligatoire à chaque connexion. Les droits d’accès découlent du rôle et du campus attribués par un administrateur.',
      },
      {
        heading: 'Usage acceptable',
        body: 'Il est interdit de déposer des contenus illicites, d’usurper l’identité d’un tiers ou de contourner les contrôles d’accès. Chaque action est journalisée dans le journal d’audit.',
      },
      {
        heading: 'Confidentialité des documents',
        body: 'Les niveaux de confidentialité (public, interne, confidentiel, secret) doivent être renseignés avec exactitude. Toute diffusion doit respecter le niveau attribué au document.',
      },
      {
        heading: 'Responsabilité et droit applicable',
        body: 'L’établissement met la plateforme à disposition sans garantie d’absence d’interruption. Les présentes conditions sont soumises au droit applicable à l’établissement.',
      },
    ],
  },
};

const DashboardFooter = () => {
  const [document, setDocument] = useState(null);
  const active = document ? LEGAL_DOCUMENTS[document] : null;
  const close = () => setDocument(null);

  return (
    <>
      <footer className="mt-12 pt-8 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground font-body">
            <span>© {new Date()?.getFullYear()} UniArchive</span>
            <span>•</span>
            <span>Version 2.1.0</span>
            <span>•</span>
            <span>Conforme RGPD</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              iconName="Shield"
              iconPosition="left"
              iconSize={14}
              onClick={() => setDocument('privacy')}
              className="text-muted-foreground hover:text-foreground font-body"
            >
              Politique de confidentialité
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconName="FileText"
              iconPosition="left"
              iconSize={14}
              onClick={() => setDocument('terms')}
              className="text-muted-foreground hover:text-foreground font-body"
            >
              Conditions d'utilisation
            </Button>
          </div>
        </div>
      </footer>

      <Modal
        isOpen={Boolean(document)}
        onClose={close}
        title={active?.title || ''}
        footer={
          <Button variant="outline" onClick={close}>
            Fermer
          </Button>
        }
      >
        {active && (
          <div className="space-y-5">
            <p className="text-sm font-body text-muted-foreground">{active.intro}</p>
            {active.sections.map((section) => (
              <div key={section.heading}>
                <h3 className="font-heading font-semibold text-foreground mb-1">
                  {section.heading}
                </h3>
                <p className="text-sm font-body text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

export default DashboardFooter;
