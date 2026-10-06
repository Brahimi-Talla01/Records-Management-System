/**
 * Contenu du centre d'aide — source unique partagée par la page `/help`
 * (atteignable depuis la navigation de toutes les pages) et la carte
 * « Aide & Support » du tableau de bord.
 *
 * Ce sont des textes produit (aucune donnée serveur) : les coordonnées de
 * support, elles, viennent de l'API publique `GET /institution`.
 */

export const GUIDE_STEPS = [
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

export const TUTORIALS = [
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
