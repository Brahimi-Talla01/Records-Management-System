/**
 * Endpoints du domaine Permissions (F6.7).
 * Accords par document (gestion) et par dossier (admin), + outil `check`.
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  documentGrantsSchema,
  permissionCheckSchema,
} from '../../lib/validate';

export const permissionsApi = {
  documentGrants: async (documentId) => {
    const { data } = await api.get(`/permissions/document/${documentId}/grants`);
    return parseOrThrow(documentGrantsSchema, data, 'GET /permissions/document/<id>/grants');
  },

  grantDocumentUser: async (documentId, userId, rights) => {
    const { data } = await api.put(`/permissions/document/${documentId}/user/${userId}`, rights);
    return data;
  },

  revokeDocumentUser: async (documentId, userId) => {
    const { data } = await api.delete(`/permissions/document/${documentId}/user/${userId}`);
    return data;
  },

  grantDocumentRole: async (documentId, roleId, rights) => {
    const { data } = await api.put(`/permissions/document/${documentId}/role/${roleId}`, rights);
    return data;
  },

  revokeDocumentRole: async (documentId, roleId) => {
    const { data } = await api.delete(`/permissions/document/${documentId}/role/${roleId}`);
    return data;
  },

  grantFolderUser: async (folderId, userId, rights) => {
    const { data } = await api.put(`/permissions/folder/${folderId}/user/${userId}`, rights);
    return data;
  },

  revokeFolderUser: async (folderId, userId) => {
    const { data } = await api.delete(`/permissions/folder/${folderId}/user/${userId}`);
    return data;
  },

  grantFolderRole: async (folderId, roleId, rights) => {
    const { data } = await api.put(`/permissions/folder/${folderId}/role/${roleId}`, rights);
    return data;
  },

  revokeFolderRole: async (folderId, roleId) => {
    const { data } = await api.delete(`/permissions/folder/${folderId}/role/${roleId}`);
    return data;
  },

  /** Outil de débogage : explique une décision de droit. */
  check: async (payload) => {
    const { data } = await api.post('/permissions/check', payload);
    return parseOrThrow(permissionCheckSchema, data, 'POST /permissions/check');
  },
};
