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
    HttpResponse.json({ departments: [demoUser.department] })
  ),

  // --- Système (P5/P6) ---
  http.get('*/health/ready', () =>
    HttpResponse.json({ status: 'ready', checks: { database: 'ok', redis: 'skipped' } })
  ),

  http.get(`${API}/version`, () =>
    HttpResponse.json({ version: '1.0.0', commit: 'abc1234', build_date: '2026-10-01' })
  ),
];
