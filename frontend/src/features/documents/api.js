/**
 * Endpoints API du domaine Documents (F3).
 * Toutes les réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  documentsListSchema,
  documentsKeysetSchema,
  documentSchema,
  documentDetailSchema,
  documentVersionSchema,
  documentPermissionsSchema,
  bulkResultSchema,
} from '../../lib/validate';
import { downloadFromApi } from '../../lib/download';

/**
 * Corps multipart d'un dépôt (F4). Les champs vides sont omis : le backend
 * applique alors les valeurs par défaut (confidentialité, rétention…).
 */
export function buildDocumentForm(payload = {}, file) {
  const form = new FormData();
  const append = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    form.append(key, value);
  };
  append('title', payload.title);
  append('description', payload.description);
  append('doc_type_id', payload.doc_type_id);
  append('department_id', payload.department_id);
  append('folder_id', payload.folder_id);
  append('confidentiality_level', payload.confidentiality_level);
  append('retention_period', payload.retention_period);
  append('change_note', payload.change_note);
  if (file) form.append('file', file);
  return form;
}

/** Filtres de liste → paramètres d'URL API (les vides sont omis). */
export function toListParams(params = {}) {
  const out = {};
  const copy = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    out[key] = value;
  };
  copy('q', params.q);
  copy('folder_id', params.folder_id);
  copy('department_id', params.department_id);
  copy('doc_type_id', params.doc_type_id);
  copy('status', params.status);
  copy('confidentiality', params.confidentiality);
  copy('tag_ids', params.tag_ids);
  copy('created_from', params.created_from);
  copy('created_to', params.created_to);
  copy('sort', params.sort);
  copy('order', params.order);
  copy('page', params.page);
  copy('per_page', params.per_page);
  if (params.pagination === 'keyset') out.pagination = 'keyset';
  if (params.pagination === 'keyset' && params.cursor) out.cursor = params.cursor;
  return out;
}

export const documentsApi = {
  /** Liste paginée : offset (`page/total/pages`) ou clé (`has_more/next_cursor`). */
  list: async (params = {}) => {
    const { data } = await api.get('/documents', { params: toListParams(params) });
    const schema = params.pagination === 'keyset' ? documentsKeysetSchema : documentsListSchema;
    return parseOrThrow(schema, data, 'GET /documents');
  },

  /**
   * Création d'un document avec son fichier → version 1 (F4.1).
   * `onUploadProgress` (axios/XHR) alimente la barre de progression ;
   * `signal` permet l'annulation (AbortController).
   */
  create: async (payload, { file, onUploadProgress, signal } = {}) => {
    const { data } = await api.post('/documents', buildDocumentForm(payload, file), {
      onUploadProgress,
      signal,
    });
    return parseOrThrow(documentSchema, data, 'POST /documents');
  },

  /** Nouvelle version d'un document existant → version N+1 (F4.1). */
  addVersion: async (documentId, file, { changeNote, onUploadProgress, signal } = {}) => {
    const form = new FormData();
    if (file) form.append('file', file);
    if (changeNote) form.append('change_note', changeNote);
    const { data } = await api.post(`/documents/${documentId}/versions`, form, {
      onUploadProgress,
      signal,
    });
    return parseOrThrow(documentVersionSchema, data, 'POST /documents/<id>/versions');
  },

  /** Détail + historique de versions. */
  get: async (documentId) => {
    const { data } = await api.get(`/documents/${documentId}`);
    return parseOrThrow(documentDetailSchema, data, 'GET /documents/<id>');
  },

  /** Métadonnées (title, description, confidentiality_level, folder_id…). */
  update: async (documentId, payload) => {
    const { data } = await api.patch(`/documents/${documentId}`, payload);
    return parseOrThrow(documentDetailSchema, data, 'PATCH /documents/<id>');
  },

  /** Suppression douce (`status='deleted'`). */
  remove: async (documentId) => {
    const { data } = await api.delete(`/documents/${documentId}`);
    return data;
  },

  restore: async (documentId) => {
    const { data } = await api.post(`/documents/${documentId}/restore`);
    return data;
  },

  /** Actions groupées : move / delete / restore / confidentiality. */
  bulk: async (payload) => {
    const { data } = await api.post('/documents/bulk', payload);
    return parseOrThrow(bulkResultSchema, data, 'POST /documents/bulk');
  },

  /** Droits effectifs de l'utilisateur courant (`view/download/edit/delete`). */
  permissions: async (documentId) => {
    const { data } = await api.get(`/permissions/document/${documentId}`);
    return parseOrThrow(documentPermissionsSchema, data, 'GET /permissions/document/<id>');
  },

  /** Historique des versions (`{versions: [...]}`). */
  versions: async (documentId) => {
    const { data } = await api.get(`/documents/${documentId}/versions`);
    return data?.versions || [];
  },

  /** Replie le document sur une version antérieure (crée la version N+1). */
  restoreVersion: async (documentId, versionId) => {
    const { data } = await api.post(`/documents/${documentId}/versions/${versionId}/restore`);
    return data;
  },

  /** Téléchargement binaire d'une version (Content-Disposition sûr côté serveur). */
  downloadVersion: async (documentId, versionId, fallbackName) =>
    downloadFromApi(
      `/documents/${documentId}/versions/${versionId}/download`,
      fallbackName
    ),

  /** Aperçu inline (PDF/images) : Blob + `URL.createObjectURL` côté composant. */
  preview: async (documentId) => {
    const { data } = await api.get(`/documents/${documentId}/preview`, {
      responseType: 'blob',
    });
    return data;
  },

  /** Export CSV avec les mêmes filtres que la liste. */
  exportCsv: async (params = {}) =>
    downloadFromApi(`/documents/export?${new URLSearchParams(toListParams(params))}`, 'documents_export.csv'),

  addTags: async (documentId, tags) => {
    const { data } = await api.post(`/documents/${documentId}/tags`, { tags });
    return data;
  },

  removeTags: async (documentId, tags) => {
    const { data } = await api.delete(`/documents/${documentId}/tags`, { data: { tags } });
    return data;
  },
};
