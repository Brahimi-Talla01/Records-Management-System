/**
 * Référentiels : lecture (F3.7, filtres) et **écriture admin** (F6.4).
 * Réponses validées par zod en frontière (Q2).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  docTypesListSchema,
  tagsListSchema,
  departmentsListSchema,
  roleListSchema,
  departmentSchema,
} from '../../lib/validate';

export const referentialsApi = {
  // --- Lecture ---
  docTypes: async () => {
    const { data } = await api.get('/doc-types');
    return parseOrThrow(docTypesListSchema, data, 'GET /doc-types').doc_types;
  },

  tags: async () => {
    const { data } = await api.get('/tags');
    return parseOrThrow(tagsListSchema, data, 'GET /tags').tags;
  },

  departments: async ({ campusId } = {}) => {
    const { data } = await api.get('/departments', {
      params: campusId ? { campus_id: campusId } : undefined,
    });
    return parseOrThrow(departmentsListSchema, data, 'GET /departments').departments;
  },

  roles: async () => {
    const { data } = await api.get('/roles');
    return parseOrThrow(roleListSchema, data, 'GET /roles').roles;
  },

  // --- Départements ---
  createDepartment: async (payload) => {
    const { data } = await api.post('/departments', payload);
    return parseOrThrow(departmentSchema, data, 'POST /departments');
  },
  updateDepartment: async (departmentId, payload) => {
    const { data } = await api.patch(`/departments/${departmentId}`, payload);
    return parseOrThrow(departmentSchema, data, 'PATCH /departments/<id>');
  },
  deleteDepartment: async (departmentId) => {
    const { data } = await api.delete(`/departments/${departmentId}`);
    return data;
  },

  // --- Types de documents ---
  createDocType: async (payload) => {
    const { data } = await api.post('/doc-types', payload);
    return data;
  },
  updateDocType: async (docTypeId, payload) => {
    const { data } = await api.patch(`/doc-types/${docTypeId}`, payload);
    return data;
  },
  deleteDocType: async (docTypeId) => {
    const { data } = await api.delete(`/doc-types/${docTypeId}`);
    return data;
  },

  // --- Étiquettes ---
  createTag: async (payload) => {
    const { data } = await api.post('/tags', payload);
    return data;
  },
  deleteTag: async (tagId) => {
    const { data } = await api.delete(`/tags/${tagId}`);
    return data;
  },

  // --- Rôles ---
  createRole: async (payload) => {
    const { data } = await api.post('/roles', payload);
    return data;
  },
  updateRole: async (roleId, payload) => {
    const { data } = await api.patch(`/roles/${roleId}`, payload);
    return data;
  },
  deleteRole: async (roleId) => {
    const { data } = await api.delete(`/roles/${roleId}`);
    return data;
  },
};
