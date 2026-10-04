import { http, HttpResponse } from 'msw';

/**
 * Handlers MSW par défaut : jeu minimal du socle (session + comptes).
 * Chaque test peut les surcharger avec `server.use(...)`.
 */
const API = '*/api';

export const demoUser = {
  user_id: 1,
  matricule: 'ADM001',
  username: 'admin.demo',
  full_name: 'Admin Démo',
  email: 'admin@demo.local',
  campus_id: null,
  is_active: true,
  two_fa_enabled: true,
  last_login: '2026-10-02T09:00:00Z',
  created_at: '2026-09-01T08:00:00Z',
  department: { department_id: 1, name: 'Informatique', code: 'INFO' },
  role: { role_id: 1, name: 'Admin' },
};

export const demoAlert = {
  alert_id: 7,
  alert_type: 'multiple_login_attempts',
  severity: 'high',
  message: '5 tentatives de connexion échouées en 10 minutes',
  is_resolved: false,
  created_at: '2026-10-02T08:30:00Z',
  resolved_at: null,
};

export const demoDocuments = [
  {
    document_id: 1,
    title: 'Rapport annuel 2025',
    description: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    status: 'active',
    confidentiality_level: 'internal',
    department_id: 1,
    doc_type_id: 1,
    folder_id: null,
    campus_id: 1,
    retention_expires_at: '2026-10-20T00:00:00Z',
    size_bytes: 1048576,
    is_encrypted: false,
  },
];

export const demoAudit = {
  audit_id: 1,
  action: 'document_created',
  object_type: 'document',
  object_id: 1,
  details: { title: 'Rapport annuel 2025' },
  created_at: '2026-10-02T09:00:00Z',
  user: { user_id: 1, username: 'admin.demo', full_name: 'Admin Démo' },
};

export const demoNotification = {
  notification_id: 1,
  type: 'document_uploaded',
  title: 'Nouveau document déposé',
  message: '« Rapport annuel 2025 » a été déposé.',
  is_read: false,
  created_at: '2026-10-02T09:00:00Z',
  action_url: '/document-library',
};

export const demoSummary = {
  role: 'campus_admin',
  campus_id: 1,
  totals: { documents: 120, active: 100, deleted: 20, storage_bytes: 52428800 },
  by_status: { active: 100, deleted: 20 },
  by_department: [{ department_id: 1, name: 'Informatique', count: 60 }],
  recent: { uploads: 12, expiring: 3 },
  me: { unread_notifications: 1, uploads_30d: 5 },
};

export const demoUsers = [
  demoUser,
  {
    user_id: 2,
    username: 'prof.demo',
    full_name: 'Prof Démo',
    email: 'prof@demo.local',
    campus_id: 1,
    is_active: true,
    role: { role_id: 2, name: 'Prof' },
  },
];

/** Détail document (F3) : le backend ajoute `versions` à `document.to_dict()`. */
export const demoDocumentDetail = {
  ...demoDocuments[0],
  versions: [
    {
      version_id: 11,
      version_number: 2,
      storage_url: 'GLOBAL/2026/10/v2_ab12.pdf',
      mime_type: 'application/pdf',
      uploaded_at: '2026-10-02T08:00:00Z',
      change_note: 'Relecture',
      uploaded_by: 1,
    },
    {
      version_id: 10,
      version_number: 1,
      storage_url: 'GLOBAL/2026/10/v1_cd34.pdf',
      mime_type: 'application/pdf',
      uploaded_at: '2026-10-01T10:00:00Z',
      change_note: null,
      uploaded_by: 1,
    },
  ],
};

export const demoFolder = {
  folder_id: 5,
  name: 'Thèses',
  created_at: '2026-09-01T08:00:00Z',
  parent_folder_id: null,
  campus_id: 1,
};

export const demoFolderTree = [
  demoFolder,
  { ...demoFolder, folder_id: 6, name: 'Informatique', subfolders: [] },
];

export const demoPermissions = {
  document_id: 1,
  effective: {
    view: { allowed: true, rule: 'confidentiality' },
    download: { allowed: true, rule: 'confidentiality' },
    edit: { allowed: false, rule: 'no_grant' },
    delete: { allowed: false, rule: 'no_grant' },
  },
};

export const demoDocTypes = [
  { doc_type_id: 1, name: 'Rapport' },
  { doc_type_id: 2, name: 'Thèse' },
];

export const demoTags = [{ tag_id: 1, name: 'IA' }, { tag_id: 2, name: 'recherche' }];

/** Résultat de recherche (F5) : document + extrait surligné `<mark>`. */
export const demoSearchResults = {
  items: [
    {
      ...demoDocuments[0],
      snippet: 'Le <mark>rapport</mark> annuel présente les <mark>activités</mark> de l’année.',
    },
  ],
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
  q: 'rapport',
  engine: 'sql_ilike',
  facets: {
    doc_types: [{ id: 1, label: 'Rapport', count: 1 }],
    departments: [{ id: 1, label: 'Informatique', count: 1 }],
    statuses: [{ value: 'active', count: 1 }],
    confidentialities: [{ value: 'internal', count: 1 }],
  },
  took_ms: 12.5,
};

/** Historique de recherche (F5.4). */
export const demoSearchHistory = {
  items: [
    {
      search_id: 1,
      query: 'rapport',
      filters: { status: 'active', department_id: 1 },
      results_count: 1,
      searched_at: '2026-10-02T09:00:00Z',
    },
  ],
  page: 1,
  per_page: 10,
  total: 1,
  pages: 1,
};

// --- Fixtures F6 (administration multi-campus) ---

export const demoCampuses = [
  {
    campus_id: 1,
    code: 'PRINCIPAL',
    name: 'Campus Principal',
    address: 'Av. de l’Unité',
    city: 'Yaoundé',
    phone: '+237 600 00 00 01',
    email: 'principal@demo.local',
    is_active: true,
    created_at: '2026-09-01T08:00:00Z',
    stats: { departments: 4, documents: 120, users: 34 },
  },
  {
    campus_id: 2,
    code: 'NORD',
    name: 'Campus Nord',
    address: null,
    city: 'Garoua',
    phone: null,
    email: null,
    is_active: false,
    created_at: '2026-09-15T08:00:00Z',
    stats: { departments: 1, documents: 8, users: 5 },
  },
];

export const demoInstitution = {
  institution_id: 1,
  name: 'Université Démo',
  short_name: 'UD',
  slogan: 'Archiver, transmettre',
  address: 'Yaoundé',
  website: 'https://demo.local',
  email: 'contact@demo.local',
  phone: '+237 600 00 00 00',
  logo_url: null,
  locale: 'fr',
  timezone: 'Africa/Douala',
  updated_at: '2026-10-02T09:00:00Z',
};

export const demoRoles = [
  { role_id: 1, name: 'Admin', description: 'Administrateur' },
  { role_id: 2, name: 'Prof', description: 'Enseignant-chercheur' },
  { role_id: 3, name: 'Secretaire', description: 'Personnel administratif' },
  { role_id: 4, name: 'Etudiant', description: 'Étudiant' },
];

export const demoDepartments = [
  {
    department_id: 1,
    name: 'Informatique',
    code: 'INFO',
    description: 'Département informatique',
    folder_id: null,
    campus_id: 1,
  },
  {
    department_id: 2,
    name: 'Mathématiques',
    code: 'MATH',
    description: null,
    folder_id: null,
    campus_id: 1,
  },
];

export const demoDocTypeFull = {
  doc_type_id: 1,
  name: 'Rapport',
  description: 'Rapports administratifs',
  default_retention_days: 365,
};

export const demoSettingsSchema = {
  categories: [
    { name: 'general', label: 'Général', keys: ['general.locale', 'general.timezone'] },
    { name: 'storage', label: 'Stockage', keys: ['storage.max_upload_mb'] },
  ],
  settings: [
    {
      key: 'general.locale',
      type: 'choice',
      default: 'fr',
      category: 'general',
      category_label: 'Général',
      scope: 'global',
      public: true,
      label: 'Langue',
      help: 'Langue de l’interface',
      choices: ['fr', 'en'],
    },
    {
      key: 'general.timezone',
      type: 'str',
      default: 'Africa/Douala',
      category: 'general',
      category_label: 'Général',
      scope: 'campus',
      public: false,
      label: 'Fuseau horaire',
    },
    {
      key: 'storage.max_upload_mb',
      type: 'int',
      default: 50,
      category: 'storage',
      category_label: 'Stockage',
      scope: 'global',
      public: true,
      label: 'Taille maximale (Mo)',
      min: 1,
      max: 500,
    },
  ],
};

export const demoSettingsValues = {
  campus_id: null,
  settings: {
    'general.locale': 'fr',
    'general.timezone': 'Africa/Douala',
    'storage.max_upload_mb': 75,
  },
};

export const demoSettingsDefaults = {
  settings: {
    'general.locale': 'fr',
    'general.timezone': 'Africa/Douala',
    'storage.max_upload_mb': 50,
  },
};

export const demoUserStats = {
  total: 34,
  active: 31,
  inactive: 3,
  by_role: [
    { role: 'Etudiant', count: 24 },
    { role: 'Prof', count: 6 },
    { role: 'Admin', count: 4 },
  ],
  by_department: [{ department: 'Informatique', count: 12 }],
};

export const demoAuditList = {
  items: [demoAudit],
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
};

export const demoRetentionStatus = {
  enabled: true,
  warning_days: 30,
  purge_after_days: 365,
  expiring_soon: 3,
  expired_active: 2,
  archived: 12,
  purgeable: 1,
  last_report: null,
};

export const demoRetentionReport = {
  report_id: 9,
  ran_at: '2026-10-02T09:00:00Z',
  dry_run: true,
  warnings_sent: 3,
  archived: 2,
  purged: 0,
  triggered_by: 1,
  details: { warning: 3 },
};

export const demoRetentionReports = {
  items: [demoRetentionReport],
  page: 1,
  per_page: 20,
  total: 1,
  pages: 1,
};

export const demoGrants = {
  users: [
    { user_id: 2, can_view: true, can_download: true, can_edit: false, can_delete: false },
  ],
  roles: [{ role_id: 2, can_view: true, can_download: false, can_edit: false, can_delete: false }],
};

export const handlers = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(demoUser)),

  http.post(`${API}/auth/login`, () =>
    HttpResponse.json({ message: '2FA requise', requires_2fa: true })
  ),

  http.post(`${API}/auth/verify-2fa`, () =>
    HttpResponse.json({ message: 'ok', user: demoUser })
  ),

  http.post(`${API}/auth/logout`, () => HttpResponse.json({ message: 'déconnecté' })),

  http.get(`${API}/auth/sessions`, () =>
    HttpResponse.json({
      sessions: [
        {
          session_id: 'abc12345…',
          created_at: '2026-10-01T10:00:00Z',
          last_seen: '2026-10-02T09:00:00Z',
          ip: '127.0.0.1',
          user_agent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0',
        },
      ],
    })
  ),

  http.delete(`${API}/auth/sessions`, () => HttpResponse.json({ message: '1 session révoquée' })),

  http.post(`${API}/auth/sessions/revoke`, () => HttpResponse.json({ message: 'Session révoquée' })),

  http.get(`${API}/auth/security-alerts`, () => HttpResponse.json({ alerts: [demoAlert] })),

  http.put(`${API}/auth/security-alerts/:id/resolve`, () =>
    HttpResponse.json({ message: 'Alerte résolue avec succès' })
  ),

  http.post(`${API}/auth/change-password`, () =>
    HttpResponse.json({ message: 'Mot de passe changé avec succès' })
  ),

  http.post(`${API}/auth/reset-password`, () =>
    HttpResponse.json({ message: 'Mot de passe réinitialisé avec succès' })
  ),

  http.post(`${API}/auth/2fa/enable`, () => HttpResponse.json({ message: 'Code envoyé' })),

  http.post(`${API}/auth/2fa/confirm`, () => HttpResponse.json({ message: '2FA activé avec succès' })),

  http.post(`${API}/auth/2fa/disable`, () => HttpResponse.json({ message: '2FA désactivé' })),

  http.get(`${API}/users`, () =>
    HttpResponse.json({
      users: demoUsers,
      total: demoUsers.length,
      pages: 1,
      current_page: 1,
      per_page: 20,
    })
  ),

  http.get(`${API}/users/roles`, () =>
    HttpResponse.json([
      { role_id: 1, name: 'Admin' },
      { role_id: 2, name: 'Prof' },
    ])
  ),

  http.get(`${API}/users/departments`, () =>
    HttpResponse.json([{ department_id: 1, name: 'Informatique', code: 'INFO' }])
  ),

  // --- Utilisateurs : écriture, stats, import/export (F6.5) ---
  http.get(`${API}/users/statistics`, () => HttpResponse.json(demoUserStats)),

  http.post(`${API}/users`, () => HttpResponse.json(demoUsers[1], { status: 201 })),

  http.put(`${API}/users/:id`, () => HttpResponse.json(demoUsers[1])),

  http.delete(`${API}/users/:id`, () =>
    HttpResponse.json({ message: 'Compte désactivé.' })
  ),

  http.post(`${API}/users/:id/reset-password`, () =>
    HttpResponse.json({
      message: 'Mot de passe réinitialisé',
      temporary_password: 'TmpPass@2026',
    })
  ),

  http.post(`${API}/users/import`, () =>
    HttpResponse.json({
      success: 1,
      total: 2,
      errors: [{ row: 3, error: 'Rôle invalide', data: { username: 'mauvais' } }],
    })
  ),

  http.get(`${API}/users/export`, () =>
    new HttpResponse('matricule,username\nADM001,admin.demo', {
      headers: { 'Content-Type': 'text/csv' },
    })
  ),

  // --- Campus & institution (F6.1–F6.3) ---
  http.get(`${API}/campuses`, () => HttpResponse.json({ campuses: demoCampuses })),

  http.get(`${API}/campuses/:id`, () => HttpResponse.json(demoCampuses[0])),

  http.post(`${API}/campuses`, () => HttpResponse.json(demoCampuses[1], { status: 201 })),

  http.put(`${API}/campuses/:id`, () => HttpResponse.json(demoCampuses[0])),

  // La désactivation est refusée si des ressources sont rattachées (409).
  http.patch(`${API}/campuses/:id/status`, () =>
    HttpResponse.json(
      {
        error: 'Campus non vide : désactivation impossible.',
        code: 'campus_not_empty',
        details: { departments: 4, documents: 120, users: 34 },
      },
      { status: 409 }
    )
  ),

  // La suppression physique est toujours interdite (décision Q4).
  http.delete(`${API}/campuses/:id`, () =>
    HttpResponse.json(
      {
        error: 'La suppression d’un campus est interdite.',
        code: 'campus_deletion_forbidden',
      },
      { status: 409 }
    )
  ),

  http.get(`${API}/institution`, () => HttpResponse.json(demoInstitution)),

  http.put(`${API}/institution`, () => HttpResponse.json(demoInstitution)),

  // --- Réglages admin (F6.3) ---
  http.get(`${API}/settings/schema`, () => HttpResponse.json(demoSettingsSchema)),

  http.get(`${API}/settings/defaults`, () => HttpResponse.json(demoSettingsDefaults)),

  http.get(`${API}/settings`, () => HttpResponse.json(demoSettingsValues)),

  http.put(`${API}/settings`, () => HttpResponse.json({ updated: 1 })),

  // --- Référentiels en écriture (F6.4) ---
  http.get(`${API}/roles`, () => HttpResponse.json({ roles: demoRoles })),

  http.post(`${API}/roles`, () =>
    HttpResponse.json({ role_id: 9, name: 'Vacataire', description: null }, { status: 201 })
  ),

  http.patch(`${API}/roles/:id`, () => HttpResponse.json(demoRoles[1])),

  http.delete(`${API}/roles/:id`, () =>
    HttpResponse.json(
      { error: 'Des comptes utilisent ce rôle.', code: 'role_in_use', details: { users: 6 } },
      { status: 409 }
    )
  ),

  http.post(`${API}/departments`, () =>
    HttpResponse.json(demoDepartments[1], { status: 201 })
  ),

  http.patch(`${API}/departments/:id`, () => HttpResponse.json(demoDepartments[0])),

  http.delete(`${API}/departments/:id`, () =>
    HttpResponse.json(
      {
        error: 'Département non vide : réaffectez son contenu.',
        code: 'department_not_empty',
        details: { users: 3, documents: 12 },
      },
      { status: 409 }
    )
  ),

  http.post(`${API}/doc-types`, () =>
    HttpResponse.json({ ...demoDocTypeFull, doc_type_id: 9, name: 'Nouveau' }, { status: 201 })
  ),

  http.patch(`${API}/doc-types/:id`, () => HttpResponse.json(demoDocTypeFull)),

  http.delete(`${API}/doc-types/:id`, () =>
    HttpResponse.json(
      { error: 'Des documents utilisent ce type.', code: 'doc_type_in_use', details: { documents: 7 } },
      { status: 409 }
    )
  ),

  http.post(`${API}/tags`, () =>
    HttpResponse.json({ tag_id: 9, name: 'nouveau' }, { status: 201 })
  ),

  http.delete(`${API}/tags/:id`, () => HttpResponse.json({ message: 'Tag supprimé.' })),

  // --- Audit (F6.8) ---
  http.get(`${API}/audit/export`, () =>
    new HttpResponse('audit_id,action\n1,document_created', {
      headers: { 'Content-Type': 'text/csv' },
    })
  ),

  http.get(`${API}/audit`, () => HttpResponse.json(demoAuditList)),

  // --- Rétention (F6.9, super admin) ---
  http.get(`${API}/admin/retention/status`, () => HttpResponse.json(demoRetentionStatus)),

  http.post(`${API}/admin/retention/run`, () => HttpResponse.json(demoRetentionReport)),

  http.get(`${API}/admin/retention/reports`, () => HttpResponse.json(demoRetentionReports)),

  // --- Permissions (F6.7) ---
  http.get(`${API}/permissions/document/:id/grants`, () => HttpResponse.json(demoGrants)),

  http.put(`${API}/permissions/document/:id/user/:uid`, () =>
    HttpResponse.json({ message: 'Droits accordés.' })
  ),

  http.delete(`${API}/permissions/document/:id/user/:uid`, () =>
    HttpResponse.json({ message: 'Droits révoqués.' })
  ),

  http.put(`${API}/permissions/document/:id/role/:rid`, () =>
    HttpResponse.json({ message: 'Droits accordés.' })
  ),

  http.delete(`${API}/permissions/document/:id/role/:rid`, () =>
    HttpResponse.json({ message: 'Droits révoqués.' })
  ),

  http.post(`${API}/permissions/check`, () =>
    HttpResponse.json({ allowed: true, reason: 'grant_user' })
  ),

  // --- Dashboard (P4) ---
  http.get(`${API}/dashboard/summary`, () => HttpResponse.json(demoSummary)),

  http.get(`${API}/dashboard/activity`, () =>
    HttpResponse.json({
      items: [demoAudit],
      page: 1,
      per_page: 10,
      total: 1,
      pages: 1,
      days: 30,
    })
  ),

  http.get(`${API}/dashboard/expiring`, () =>
    HttpResponse.json({
      items: demoDocuments,
      page: 1,
      per_page: 10,
      total: 1,
      pages: 1,
      days: 30,
    })
  ),

  http.get(`${API}/dashboard/uploads`, () =>
    HttpResponse.json({
      months: [
        { month: '2026-09', count: 3, bytes: 1048576 },
        { month: '2026-10', count: 2, bytes: 524288 },
      ],
      months_count: 2,
    })
  ),

  http.get(`${API}/dashboard/recent-documents`, () =>
    HttpResponse.json({ items: demoDocuments, limit: 6 })
  ),

  // --- Notifications (P4) ---
  http.get(`${API}/notifications/unread-count`, () => HttpResponse.json({ unread: 1 })),

  http.get(`${API}/notifications`, () =>
    HttpResponse.json({
      items: [demoNotification],
      page: 1,
      per_page: 20,
      total: 1,
      pages: 1,
      unread: 1,
    })
  ),

  http.patch(`${API}/notifications/:id/read`, () => HttpResponse.json(demoNotification)),

  http.post(`${API}/notifications/read-all`, () => HttpResponse.json({ updated: 1 })),

  http.delete(`${API}/notifications/:id`, () => HttpResponse.json({ deleted: true })),

  // --- Documents (P2 / F3) ---
  // Avant `/documents/:id` : sinon "export" serait lu comme un identifiant.
  http.get(`${API}/documents/export`, () =>
    new HttpResponse('ID,Titre\n1,Rapport annuel 2025', {
      headers: { 'Content-Type': 'text/csv' },
    })
  ),

  http.get(`${API}/documents`, () =>
    HttpResponse.json({
      items: demoDocuments,
      page: 1,
      per_page: 20,
      total: 1,
      pages: 1,
    })
  ),

  http.post(`${API}/documents`, () => HttpResponse.json(demoDocuments[0], { status: 201 })),

  http.get(`${API}/documents/:id`, () => HttpResponse.json(demoDocumentDetail)),

  http.patch(`${API}/documents/:id`, () => HttpResponse.json(demoDocumentDetail)),

  http.delete(`${API}/documents/:id`, () => HttpResponse.json(demoDocumentDetail)),

  http.post(`${API}/documents/:id/restore`, () => HttpResponse.json(demoDocumentDetail)),

  http.post(`${API}/documents/bulk`, () => HttpResponse.json({ updated: [1] })),

  http.get(`${API}/documents/:id/versions`, () =>
    HttpResponse.json({ versions: demoDocumentDetail.versions })
  ),

  http.post(`${API}/documents/:id/versions`, () =>
    HttpResponse.json(demoDocumentDetail.versions[0], { status: 201 })
  ),

  http.post(`${API}/documents/:id/versions/:vid/restore`, () =>
    HttpResponse.json(demoDocumentDetail.versions[1])
  ),

  http.post(`${API}/documents/:id/tags`, () => HttpResponse.json(demoDocumentDetail)),

  http.delete(`${API}/documents/:id/tags`, () => HttpResponse.json(demoDocumentDetail)),

  http.get(`${API}/permissions/document/:id`, () => HttpResponse.json(demoPermissions)),

  // --- Dossiers (P2 / F3) ---
  http.get(`${API}/folders`, () => HttpResponse.json({ folders: demoFolderTree })),

  http.get(`${API}/folders/:id/path`, () =>
    HttpResponse.json({ path: [demoFolder] })
  ),

  http.post(`${API}/folders`, () => HttpResponse.json(demoFolder)),

  http.patch(`${API}/folders/:id`, () => HttpResponse.json(demoFolder)),

  http.post(`${API}/folders/:id/move`, () => HttpResponse.json(demoFolder)),

  http.delete(`${API}/folders/:id`, () =>
    HttpResponse.json({ message: 'Dossier supprimé.' })
  ),

  // --- Recherche (P4 / F5) ---
  http.get(`${API}/search`, () => HttpResponse.json(demoSearchResults)),

  http.get(`${API}/search/history`, () => HttpResponse.json(demoSearchHistory)),

  http.delete(`${API}/search/history`, () => HttpResponse.json({ deleted: 1 })),

  // --- Réglages publics (F4 : limites de dépôt, OCR, scanner) ---
  http.get(`${API}/settings/public`, () =>
    HttpResponse.json({
      settings: {
        'general.locale': 'fr',
        'storage.max_upload_mb': 50,
        'storage.allowed_extensions': ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'],
        'features.ocr_enabled': false,
        'features.scanner_enabled': false,
        'features.audit_enabled': true,
      },
    })
  ),

  // --- Référentiels (F3.7) ---
  http.get(`${API}/doc-types`, () => HttpResponse.json({ doc_types: demoDocTypes })),

  http.get(`${API}/tags`, () => HttpResponse.json({ tags: demoTags })),

  http.get(`${API}/departments`, () =>
    HttpResponse.json({ departments: demoDepartments })
  ),

  // --- Système (P5/P6) ---
  http.get('*/health/ready', () =>
    HttpResponse.json({ status: 'ready', checks: { database: 'ok', redis: 'skipped' } })
  ),

  http.get(`${API}/version`, () =>
    HttpResponse.json({ version: '1.0.0', commit: 'abc1234', build_date: '2026-10-01' })
  ),
];
