/**
 * Modèle CSV d'import des comptes (F6.5).
 *
 * Le serveur (`UserService.import_users_from_csv`) lit l'en-tête **tel quel** :
 * `matricule,username,email,full_name,role_id,department_id,is_active`.
 * Le modèle est donc généré côté client, avec un exemple de ligne et des
 * identifiants de rôle/département réels quand ils sont connus, pour éviter
 * de deviner le format.
 */


const HEADERS = [
  'matricule',
  'username',
  'email',
  'full_name',
  'role_id',
  'department_id',
  'is_active',
];

/** Échappe une cellule CSV (guillemets, virgules, points-virgules, sauts). */
const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Construit le contenu du modèle (en-tête + une ligne d'exemple).
 * `role_id` / `department_id` sont optionnels côté serveur : la ligne d'exemple
 * utilise les premiers identifiants disponibles, sinon une cellule vide.
 */
export function buildUsersCsvTemplate({ roles = [], departments = [] } = {}) {
  const roleId = roles[0]?.role_id ?? '';
  const departmentId = departments[0]?.department_id ?? '';
  const rows = [
    HEADERS,
    [
      'ETU2026-001',
      'prenom.nom',
      'prenom.nom@etu.univ-douala.com',
      'Prénom Nom',
      roleId,
      departmentId,
      'true',
    ],
  ];
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/** Télécharge le modèle via un Blob (retourne le nom de fichier utilisé). */
export function downloadUsersCsvTemplate(
  options,
  filename = 'modele_import_utilisateurs.csv'
) {
  const csv = buildUsersCsvTemplate(options);
  // BOM UTF-8 : Excel ouvre correctement les accents.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}
