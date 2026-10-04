/**
 * Validation runtime des réponses API (décision Q2 : zod en frontière).
 *
 * Chaque `features/<domaine>/api.js` valide ce qu'il reçoit avant de le rendre
 * au reste de l'app : une réponse qui dérive casse ici, pas dans un écran.
 */
import { z } from 'zod';

/** Erreur levée quand une réponse ne respecte pas le contrat attendu. */
export class ApiContractError extends Error {
  constructor(context, issues) {
    super(`Réponse API invalide (${context}) : ${issues.map((i) => i.path.join('.') || '(racine)').join(', ')}`);
    this.name = 'ApiContractError';
    this.context = context;
    this.issues = issues;
  }
}

/**
 * Valide `data` contre `schema` et renvoie les données typées.
 * Lève `ApiContractError` (avec le détail zod) en cas d'échec.
 */
export function parseOrThrow(schema, data, context = 'réponse') {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiContractError(context, result.error.issues);
  }
  return result.data;
}

/**
 * Schémas réutilisables, tolérants aux champs non déclarés (le backend peut
 * enrichir une entité sans casser le front). On ne valide que le squelette
 * dont l'UI dépend réellement.
 */
export const looseObject = (shape) => z.looseObject(shape);

export const paginationSchema = z.looseObject({
  total: z.number().optional(),
  pages: z.number().optional(),
  page: z.number().optional(),
  current_page: z.number().optional(),
  per_page: z.number().optional(),
});

export const roleSchema = z.looseObject({
  role_id: z.number().optional(),
  name: z.string(),
});

export const departmentSchema = z.looseObject({
  department_id: z.number().optional(),
  name: z.string().optional(),
  code: z.string().nullable().optional(),
});

export const userSchema = z.looseObject({
  user_id: z.number().optional(),
  id: z.number().optional(),
  matricule: z.string().nullable().optional(),
  username: z.string(),
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  role: roleSchema.nullable().optional(),
  department: departmentSchema.nullable().optional(),
  campus_id: z.number().nullable().optional(),
  campus: z.looseObject({ name: z.string().optional() }).nullable().optional(),
  is_active: z.boolean().optional(),
  two_fa_enabled: z.boolean().optional(),
  last_login: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

/**
 * Règles de mot de passe, miroir de `validate_password_strength` (backend).
 * Utilisé par les formulaires mon compte et réinitialisation.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Au moins 8 caractères')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/\d/, 'Au moins un chiffre');

/** Session active (`GET /auth/sessions`). */
export const sessionSchema = z.looseObject({
  session_id: z.string(),
  created_at: z.string().nullable().optional(),
  last_seen: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
});

export const sessionsListSchema = z.looseObject({
  sessions: z.array(sessionSchema),
});

/** Alerte de sécurité (`GET /auth/security-alerts`). */
export const securityAlertSchema = z.looseObject({
  alert_id: z.number(),
  alert_type: z.string().optional(),
  severity: z.string().optional(),
  message: z.string(),
  is_resolved: z.boolean().optional(),
  created_at: z.string().optional(),
  resolved_at: z.string().nullable().optional(),
});

export const securityAlertsListSchema = z.looseObject({
  alerts: z.array(securityAlertSchema),
});

/** Liste paginée de comptes (`GET /users`). */
export const usersListSchema = paginationSchema.extend({
  users: z.array(userSchema),
});

/** Liste d'items générique (nouvelle convention d'enveloppe backend). */
export const itemsListSchema = (item) =>
  paginationSchema.extend({ items: z.array(item) });

/** Document (`document.to_dict()` — P2). */
export const documentSchema = z.looseObject({
  document_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  status: z.string().optional(),
  confidentiality_level: z.string().optional(),
  department_id: z.number().nullable().optional(),
  doc_type_id: z.number().nullable().optional(),
  folder_id: z.number().nullable().optional(),
  campus_id: z.number().nullable().optional(),
  retention_period: z.number().nullable().optional(),
  retention_expires_at: z.string().nullable().optional(),
  size_bytes: z.number().nullable().optional(),
  is_encrypted: z.boolean().optional(),
  overdue: z.boolean().optional(),
});

/** `GET /dashboard/recent-documents` : `{items, limit}`. */
export const recentDocumentsSchema = z.looseObject({
  items: z.array(documentSchema),
  limit: z.number().optional(),
});

/** `GET /dashboard/expiring` : liste paginée + `days` + `overdue` par item. */
export const expiringDocumentsSchema = paginationSchema.extend({
  items: z.array(documentSchema),
  days: z.number().optional(),
});

/** Version de document (`document_version.to_dict()` — P2). */
export const documentVersionSchema = z.looseObject({
  version_id: z.number(),
  version_number: z.number(),
  storage_url: z.string().optional(),
  mime_type: z.string().nullable().optional(),
  uploaded_at: z.string().nullable().optional(),
  change_note: z.string().nullable().optional(),
  uploaded_by: z.number().nullable().optional(),
});

/**
 * `GET /documents/<id>` : détail + historique de versions.
 * `tags` n'est **pas** encore renvoyé par `document.to_dict()` (ligne R6‑03) :
 * schéma tolérant pour s'allumer dès le correctif backend.
 */
export const documentDetailSchema = documentSchema.extend({
  versions: z.array(documentVersionSchema).optional(),
  tags: z
    .array(z.looseObject({ tag_id: z.number().optional(), name: z.string() }))
    .optional(),
});

/** `GET /documents` (mode offset, par défaut) : pagination classique. */
export const documentsListSchema = paginationSchema.extend({
  items: z.array(documentSchema),
});

/** `GET /documents?pagination=keyset` : `{items, has_more, next_cursor}` sans COUNT(*). */
export const documentsKeysetSchema = z.looseObject({
  items: z.array(documentSchema),
  per_page: z.number().optional(),
  has_more: z.boolean().optional(),
  next_cursor: z.string().nullable().optional(),
});

/** `POST /documents/bulk` : ids réellement traités. */
export const bulkResultSchema = z.looseObject({
  updated: z.array(z.number()),
});

/** Dossier (`folder.to_dict()` ; `subfolders` présent en vue arbre). */
export const folderSchema = z.looseObject({
  folder_id: z.number(),
  name: z.string(),
  created_at: z.string().nullable().optional(),
  parent_folder_id: z.number().nullable().optional(),
  campus_id: z.number().nullable().optional(),
});

export const folderTreeNodeSchema = folderSchema.extend({
  subfolders: z.array(z.lazy(() => folderTreeNodeSchema)).optional(),
});

/** `GET /folders[?view=tree]` : `{folders: [...]}` (plat ou arbre). */
export const foldersListSchema = z.looseObject({
  folders: z.array(folderTreeNodeSchema),
});

/** `GET /folders/<id>/path` : `{path: [...]}` du root vers le dossier. */
export const folderPathSchema = z.looseObject({
  path: z.array(folderSchema),
});

/** `GET /permissions/document/<id>` : droits effectifs + règle appliquée. */
export const documentPermissionsSchema = z.looseObject({
  document_id: z.number(),
  effective: z.record(
    z.string(),
    z.looseObject({ allowed: z.boolean(), rule: z.string().optional() })
  ),
});

/** `GET /doc-types` · `GET /tags` · `GET /departments` : référentiels de filtre. */
export const docTypesListSchema = z.looseObject({
  doc_types: z.array(z.looseObject({ doc_type_id: z.number(), name: z.string() })),
});

export const tagsListSchema = z.looseObject({
  tags: z.array(z.looseObject({ tag_id: z.number(), name: z.string() })),
});

export const departmentsListSchema = z.looseObject({
  departments: z.array(departmentSchema),
});

/** `GET /dashboard/summary` : agrégats adaptés au rôle. */
export const dashboardSummarySchema = z.looseObject({
  role: z.string().optional(),
  campus_id: z.number().nullable().optional(),
  totals: z.looseObject({
    documents: z.number(),
    active: z.number(),
    deleted: z.number(),
    storage_bytes: z.number(),
  }),
  by_status: z.record(z.string(), z.number()).optional(),
  by_department: z
    .array(
      z.looseObject({
        department_id: z.number().nullable().optional(),
        name: z.string().nullable().optional(),
        count: z.number(),
      })
    )
    .optional(),
  recent: z.looseObject({ uploads: z.number(), expiring: z.number() }).optional(),
  me: z
    .looseObject({
      unread_notifications: z.number().optional(),
      uploads_30d: z.number().optional(),
    })
    .optional(),
});

/** Entrée du journal d'audit (`audit.to_dict()` — P5). */
export const auditEntrySchema = z.looseObject({
  audit_id: z.number(),
  action: z.string(),
  object_type: z.string().optional(),
  object_id: z.number().nullable().optional(),
  details: z.unknown().optional(),
  created_at: z.string().optional(),
  user: z
    .looseObject({
      user_id: z.number().optional(),
      username: z.string().optional(),
      full_name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

/** `GET /dashboard/activity` : audit paginé + période. */
export const activityListSchema = paginationSchema.extend({
  items: z.array(auditEntrySchema),
  days: z.number().optional(),
});

/** `GET /dashboard/uploads` : dépôts par mois (zéro rempli). */
export const uploadsSchema = z.looseObject({
  months: z.array(
    z.looseObject({
      month: z.string(),
      count: z.number(),
      bytes: z.number(),
    })
  ),
  months_count: z.number().optional(),
});

/** Notification in-app (`notification.to_dict()`). */
export const notificationSchema = z.looseObject({
  notification_id: z.number(),
  type: z.string().nullable().optional(),
  title: z.string(),
  message: z.string().nullable().optional(),
  is_read: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  action_url: z.string().nullable().optional(),
});

/** `GET /notifications` : liste paginée + compteur `unread`. */
export const notificationsListSchema = paginationSchema.extend({
  items: z.array(notificationSchema),
  unread: z.number().optional(),
});

/** `GET /notifications/unread-count`. */
export const unreadCountSchema = z.looseObject({ unread: z.number() });

/** `GET /health/ready` (200 `ready` ou 503 `degraded`). */
export const readinessSchema = z.looseObject({
  status: z.string(),
  checks: z.record(z.string(), z.string()).optional(),
});

/** `GET /api/version`. */
export const versionSchema = z.looseObject({
  version: z.string(),
  commit: z.string().optional(),
  build_date: z.string().nullable().optional(),
});

/** `GET /search` : un document + extrait surligné (`<mark>`, F5.3). */
export const searchResultSchema = documentSchema.extend({
  snippet: z.string().nullable().optional(),
});

const facetItemSchema = z.looseObject({
  id: z.number().nullable().optional(),
  label: z.string().nullable().optional(),
  count: z.number(),
});

const valueFacetSchema = z.looseObject({
  value: z.string(),
  count: z.number(),
});

/** Facettes renvoyées par l'API → filtres cliquables (F5.2). */
export const searchFacetsSchema = z.looseObject({
  doc_types: z.array(facetItemSchema).optional(),
  departments: z.array(facetItemSchema).optional(),
  statuses: z.array(valueFacetSchema).optional(),
  confidentialities: z.array(valueFacetSchema).optional(),
});

/** `GET /search` : liste paginée + moteur, facettes et durée (F5.1). */
export const searchResultsSchema = paginationSchema.extend({
  items: z.array(searchResultSchema),
  q: z.string().optional(),
  engine: z.string().optional(),
  facets: searchFacetsSchema.optional(),
  took_ms: z.number().optional(),
});

/** Entrée d'historique de recherche (`search_history.to_dict()` — P4). */
export const searchHistoryEntrySchema = z.looseObject({
  search_id: z.number(),
  query: z.string().nullable().optional(),
  filters: z.unknown().optional(),
  results_count: z.number().nullable().optional(),
  searched_at: z.string().nullable().optional(),
});

/** `GET /search/history` : liste paginée des recherches passées. */
export const searchHistorySchema = paginationSchema.extend({
  items: z.array(searchHistoryEntrySchema),
});

/** Campus (`campus.to_dict(include_stats=True)`). */
export const campusSchema = z.looseObject({
  campus_id: z.number(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().nullable().optional(),
  stats: z
    .looseObject({
      departments: z.number().optional(),
      documents: z.number().optional(),
      users: z.number().optional(),
    })
    .optional(),
});

export const campusesListSchema = z.looseObject({
  campuses: z.array(campusSchema),
});

/** `GET/PUT /institution`. */
export const institutionSchema = z.looseObject({
  institution_id: z.number().nullable().optional(),
  name: z.string(),
  short_name: z.string().nullable().optional(),
  slogan: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  updated_at: z.string().nullable().optional(),
});

/** `GET /settings/schema` : définitions typées des réglages. */
export const settingDefinitionSchema = z.looseObject({
  key: z.string(),
  type: z.string(),
  default: z.unknown(),
  category: z.string().optional(),
  category_label: z.string().optional(),
  scope: z.string().optional(),
  public: z.boolean().optional(),
  label: z.string().optional(),
  help: z.string().optional(),
  choices: z.array(z.string()).optional(),
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
});

export const settingsSchemaSchema = z.looseObject({
  categories: z
    .array(z.looseObject({ name: z.string(), label: z.string(), keys: z.array(z.string()) }))
    .optional(),
  settings: z.array(settingDefinitionSchema),
});

export const settingsValuesSchema = z.looseObject({
  campus_id: z.number().nullable().optional(),
  settings: z.record(z.string(), z.unknown()),
});

/** `GET /roles` : rôles (écriture admin en F6). */
export const roleListSchema = z.looseObject({
  roles: z.array(
    z.looseObject({ role_id: z.number(), name: z.string(), description: z.string().nullable().optional() })
  ),
});

/** `GET /users/statistics`. */
export const userStatisticsSchema = z.looseObject({
  total: z.number().optional(),
  active: z.number().optional(),
  inactive: z.number().optional(),
  by_role: z.array(z.looseObject({ role: z.string(), count: z.number() })).optional(),
  by_department: z.array(z.looseObject({ department: z.string(), count: z.number() })).optional(),
});

/** `POST /users/import` : rapport d'import ligne à ligne. */
export const userImportResultSchema = z.looseObject({
  success: z.number().optional(),
  total: z.number().optional(),
  errors: z
    .array(
      z.looseObject({
        row: z.number().nullable().optional(),
        error: z.string(),
        data: z.unknown().optional(),
      })
    )
    .optional(),
});

/** `GET /audit` : journal paginé (réutilise `auditEntrySchema`). */
export const auditListSchema = paginationSchema.extend({
  items: z.array(auditEntrySchema),
});

/** `GET /admin/retention/status`. */
export const retentionReportSchema = z.looseObject({
  report_id: z.number(),
  ran_at: z.string().nullable().optional(),
  dry_run: z.boolean().optional(),
  warnings_sent: z.number().optional(),
  archived: z.number().optional(),
  purged: z.number().optional(),
  triggered_by: z.number().nullable().optional(),
  details: z.unknown().optional(),
});

export const retentionStatusSchema = z.looseObject({
  enabled: z.boolean().optional(),
  warning_days: z.number().optional(),
  purge_after_days: z.number().optional(),
  expiring_soon: z.number().optional(),
  expired_active: z.number().optional(),
  archived: z.number().optional(),
  purgeable: z.number().optional(),
  last_report: retentionReportSchema.nullable().optional(),
});

export const retentionReportsSchema = paginationSchema.extend({
  items: z.array(retentionReportSchema),
});

/** `GET /permissions/document/<id>/grants` : accords utilisateurs + rôles. */
const grantSchema = z.looseObject({
  user_id: z.number().optional(),
  role_id: z.number().optional(),
  can_view: z.boolean().optional(),
  can_download: z.boolean().optional(),
  can_edit: z.boolean().optional(),
  can_delete: z.boolean().optional(),
});

export const documentGrantsSchema = z.looseObject({
  users: z.array(grantSchema).optional(),
  roles: z.array(grantSchema).optional(),
});

/** `POST /permissions/check`. */
export const permissionCheckSchema = z.looseObject({
  allowed: z.boolean(),
  reason: z.string().optional(),
});

/**
 * `GET /settings/public` (F4) : réglages exposés sans authentification.
 * Sert au dépôt : taille max, extensions autorisées, OCR et scanner.
 */
export const publicSettingsSchema = z.looseObject({
  settings: z
    .looseObject({
      'storage.max_upload_mb': z.number().optional(),
      'storage.allowed_extensions': z.array(z.string()).optional(),
      'features.ocr_enabled': z.boolean().optional(),
      'features.scanner_enabled': z.boolean().optional(),
      'features.audit_enabled': z.boolean().optional(),
      'general.locale': z.string().optional(),
      'general.timezone': z.string().optional(),
      'general.date_format': z.string().optional(),
      'auth.two_factor_required': z.boolean().optional(),
      'auth.password_min_length': z.number().optional(),
    })
    .optional(),
});
