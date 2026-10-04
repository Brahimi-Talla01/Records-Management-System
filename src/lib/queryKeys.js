/**
 * Clés de cache TanStack Query, centralisées par domaine.
 * Une clé écrite à la main dans une page est une source de désynchronisation :
 * on importe toujours depuis ici.
 */
export const authKeys = {
  all: ['auth'],
  me: ['auth', 'me'],
  sessions: ['auth', 'sessions'],
  securityAlerts: ['auth', 'security-alerts'],
};

export const usersKeys = {
  all: ['users'],
  list: (params) => ['users', 'list', params],
  detail: (id) => ['users', 'detail', id],
  statistics: ['users', 'statistics'],
  roles: ['users', 'roles'],
  departments: ['users', 'departments'],
};

export const documentsKeys = {
  all: ['documents'],
  list: (params) => ['documents', 'list', params],
  detail: (id) => ['documents', 'detail', id],
  versions: (id) => ['documents', id, 'versions'],
  permissions: (id) => ['documents', id, 'permissions'],
};

export const foldersKeys = {
  all: ['folders'],
  tree: (params) => ['folders', 'tree', params],
  path: (id) => ['folders', id, 'path'],
};

export const referentialsKeys = {
  all: ['referentials'],
  docTypes: ['referentials', 'doc-types'],
  tags: ['referentials', 'tags'],
  departments: ['referentials', 'departments'],
};

export const searchKeys = {
  all: ['search'],
  results: (params) => ['search', 'results', params],
  history: ['search', 'history'],
  saved: ['search', 'saved'],
};

export const dashboardKeys = {
  summary: ['dashboard', 'summary'],
  activity: (params) => ['dashboard', 'activity', params],
  expiring: (params) => ['dashboard', 'expiring', params],
  uploads: (params) => ['dashboard', 'uploads', params],
  recent: ['dashboard', 'recent-documents'],
};

export const notificationsKeys = {
  all: ['notifications'],
  list: (params) => ['notifications', 'list', params],
  unreadCount: ['notifications', 'unread-count'],
};

export const campusesKeys = {
  all: ['campuses'],
  list: (params) => ['campuses', 'list', params],
  detail: (id) => ['campuses', 'detail', id],
};

export const settingsKeys = {
  all: ['settings'],
  schema: ['settings', 'schema'],
  values: ['settings', 'values'],
  public: ['settings', 'public'],
};

export const systemKeys = {
  all: ['system'],
  readiness: ['system', 'readiness'],
  version: ['system', 'version'],
};
