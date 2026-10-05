/**
 * Endpoints API du domaine Dossiers (F3).
 * `GET /folders` renvoie une liste plate ; `?view=tree` un arbre imbriqué.
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  foldersListSchema,
  folderPathSchema,
} from '../../lib/validate';

/**
 * Aplatit l'arbre renvoyé par `?view=tree` : `Map<folder_id, node & {depth, parent_id}>`.
 * Sert au fil d'Ariane, au sélecteur de destination et à l'anti-cycle côté UI.
 */
export function flattenTree(nodes = [], depth = 0, parent = null, acc = new Map()) {
  for (const node of nodes) {
    acc.set(node.folder_id, { ...node, depth, parent_id: parent });
    flattenTree(node.subfolders || [], depth + 1, node.folder_id, acc);
  }
  return acc;
}

export const foldersApi = {
  /** Arbre complet (ou liste plate si `tree` est false). */
  list: async ({ tree = true, parentId, departmentId } = {}) => {
    const params = { view: tree ? 'tree' : undefined };
    if (parentId !== undefined) params.parent_id = parentId;
    if (departmentId) params.department_id = departmentId;
    const { data } = await api.get('/folders', { params });
    return parseOrThrow(foldersListSchema, data, 'GET /folders').folders;
  },

  /** Chemin racine → dossier (fil d'Ariane). */
  path: async (folderId) => {
    const { data } = await api.get(`/folders/${folderId}/path`);
    return parseOrThrow(folderPathSchema, data, 'GET /folders/<id>/path').path;
  },

  create: async (payload) => {
    const { data } = await api.post('/folders', payload);
    return data;
  },

  update: async (folderId, payload) => {
    const { data } = await api.patch(`/folders/${folderId}`, payload);
    return data;
  },

  /** Déplacement (anti-cycle : `409 folder_cycle` traduit par lib/errors). */
  move: async (folderId, parentFolderId) => {
    const { data } = await api.post(`/folders/${folderId}/move`, {
      parent_folder_id: parentFolderId ?? null,
    });
    return data;
  },

  /** Suppression refusée si non vide (`409 folder_not_empty`). */
  remove: async (folderId) => {
    const { data } = await api.delete(`/folders/${folderId}`);
    return data;
  },
};
