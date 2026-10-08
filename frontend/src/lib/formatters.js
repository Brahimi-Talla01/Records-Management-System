/**
 * Fabriques de libellés et de métadonnées d'affichage, partagées par toute
 * l'application (rôle, taille, dates, statuts, niveaux de confidentialité).
 * Aucune couleur ici : uniquement des `variant` consommés par <Badge>.
 */

/** Rôle backend (Admin/Prof/Etudiant/Secretaire) → clé UI (admin/teacher/…). */
export function mapBackendRole(roleName) {
  const r = (roleName || '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'prof' || r === 'teacher') return 'teacher';
  if (r === 'etudiant' || r === 'student') return 'student';
  if (r === 'secretaire' || r === 'staff') return 'staff';
  return r;
}

/** Libellé français d'un rôle UI. */
export function getRoleLabel(role) {
  return (
    {
      admin: 'Administrateur',
      teacher: 'Enseignant-Chercheur',
      student: 'Étudiant',
      staff: 'Personnel Administratif',
    }[role] || 'Utilisateur'
  );
}

/** Taille lisible (octets → ko/Mo/Go), en français. */
export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const units = ['o', 'ko', 'Mo', 'Go'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Date au format français (date seule par défaut). */
export function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', options);
}

/** Statut de document → libellé + variante de Badge. */
export function getDocumentStatusMeta(status) {
  return (
    {
      active: { label: 'Actif', variant: 'success' },
      archived: { label: 'Archivé', variant: 'neutral' },
      deleted: { label: 'Corbeille', variant: 'error' },
      pending: { label: 'En attente', variant: 'warning' },
    }[status] || { label: status || '—', variant: 'neutral' }
  );
}

/** Date et heure au format français. */
export function formatDateTime(value) {
  return formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Écart lisible depuis une date (« À l'instant », « Il y a 5 min », « Il y a 3 h »…). */
export function formatRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days} j`;
  return formatDate(date);
}

/**
 * Libellé lisible d'un User-Agent (« Chrome sur Linux ») pour l'écran appareils.
 * Volontairement tolérant : un UA inconnu retombe sur la chaîne brute tronquée.
 */
export function describeUserAgent(userAgent) {
  if (!userAgent) return 'Appareil inconnu';
  const ua = String(userAgent);
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  if (browser && os) return `${browser} sur ${os}`;
  if (browser) return browser;
  if (os) return os;
  return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua;
}

/** Type technique d'alerte (`alert_type`) → libellé français lisible. */
export function getAlertTypeLabel(alertType) {
  return (
    {
      multiple_login_attempts: 'Tentatives de connexion multiples',
      suspicious_location: 'Connexion inhabituelle',
      new_device: 'Nouvel appareil',
      password_changed: 'Mot de passe modifié',
      account_locked: 'Compte verrouillé',
    }[alertType] || (alertType ? alertType.replace(/_/g, ' ') : 'Alerte de sécurité')
  );
}

/** Sévérité d'alerte de sécurité → libellé + variante de Badge (tokens uniquement). */
export function getAlertSeverityMeta(severity) {
  return (
    {
      high: { label: 'Élevée', variant: 'error' },
      medium: { label: 'Moyenne', variant: 'warning' },
      low: { label: 'Faible', variant: 'info' },
    }[severity] || { label: severity || 'Info', variant: 'neutral' }
  );
}

/**
 * Action du journal d'audit → libellé français + icône du registre.
 * Le repli humanise la clé brute (`document_untagged` → « Document untagged »)
 * pour ne jamais afficher une chaîne technique dans l'UI.
 */
export function getAuditActionMeta(action) {
  return (
    {
      document_created: { label: 'Document déposé', icon: 'Upload' },
      document_updated: { label: 'Document modifié', icon: 'Edit' },
      document_deleted: { label: 'Document supprimé', icon: 'Trash2' },
      document_restored: { label: 'Document restauré', icon: 'RotateCcw' },
      document_downloaded: { label: 'Document téléchargé', icon: 'Download' },
      document_version_added: { label: 'Nouvelle version', icon: 'Files' },
      document_version_restored: { label: 'Version restaurée', icon: 'History' },
      document_tagged: { label: 'Tag ajouté', icon: 'Tag' },
      document_untagged: { label: 'Tag retiré', icon: 'Tag' },
      document_archived: { label: 'Document archivé', icon: 'Archive' },
      document_purged: { label: 'Document purgé', icon: 'Trash2' },
      folder_created: { label: 'Dossier créé', icon: 'FolderPlus' },
      folder_updated: { label: 'Dossier modifié', icon: 'Edit' },
      folder_moved: { label: 'Dossier déplacé', icon: 'Folder' },
      folder_deleted: { label: 'Dossier supprimé', icon: 'Trash2' },
      user_created: { label: 'Utilisateur créé', icon: 'UserPlus' },
      user_updated: { label: 'Utilisateur modifié', icon: 'Edit' },
      user_deleted: { label: 'Utilisateur désactivé', icon: 'UserX' },
      permission_granted: { label: 'Droit accordé', icon: 'ShieldCheck' },
      permission_revoked: { label: 'Droit révoqué', icon: 'Shield' },
      permission_denied: { label: 'Accès refusé', icon: 'Lock' },
      login: { label: 'Connexion', icon: 'LogIn' },
      login_2fa_required: { label: 'Connexion (2FA requise)', icon: 'Key' },
      login_2fa_success: { label: 'Connexion réussie', icon: 'LogIn' },
      login_failed: { label: 'Échec de connexion', icon: 'AlertTriangle' },
      logout: { label: 'Déconnexion', icon: 'LogOut' },
      logout_all_sessions: { label: 'Sessions révoquées', icon: 'LogOut' },
      password_changed: { label: 'Mot de passe modifié', icon: 'Key' },
      password_reset_requested: { label: 'Réinitialisation demandée', icon: 'Key' },
      password_reset_completed: { label: 'Mot de passe réinitialisé', icon: 'Key' },
      '2fa_enabled': { label: '2FA activée', icon: 'ShieldCheck' },
      '2fa_disabled': { label: '2FA désactivée', icon: 'Shield' },
      retention_run: { label: 'Cycle de rétention', icon: 'Clock' },
      retention_warning: { label: 'Préavis de rétention', icon: 'AlertTriangle' },
      settings_updated: { label: 'Réglages mis à jour', icon: 'Settings' },
      campus_created: { label: 'Campus créé', icon: 'Building' },
      campus_updated: { label: 'Campus modifié', icon: 'Building' },
      campus_status_changed: { label: 'Statut campus modifié', icon: 'Building' },
    }[action] || {
      label: action ? action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Activité',
      icon: 'Activity',
    }
  );
}

/** Type de notification in-app → libellé + variante de Badge + icône. */
export function getNotificationTypeMeta(type) {
  return (
    {
      document_uploaded: { label: 'Dépôt', variant: 'info', icon: 'Upload' },
      permission_granted: { label: 'Droit', variant: 'success', icon: 'ShieldCheck' },
      retention_warning: { label: 'Échéance', variant: 'warning', icon: 'AlertTriangle' },
      security_alert: { label: 'Sécurité', variant: 'error', icon: 'Shield' },
    }[type] || { label: 'Notification', variant: 'neutral', icon: 'Bell' }
  );
}

/** Niveau de confidentialité → libellé + variante de Badge. */
export function getConfidentialityMeta(level) {
  return (
    {
      public: { label: 'Public', variant: 'info' },
      internal: { label: 'Interne', variant: 'neutral' },
      confidential: { label: 'Confidentiel', variant: 'warning' },
      secret: { label: 'Secret', variant: 'error' },
    }[level] || { label: level || '—', variant: 'neutral' }
  );
}
