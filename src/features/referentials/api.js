/**
 * Référentiels de lecture (F3.7) : alimentent les filtres de la bibliothèque.
 * Lecture seule ici — l'écriture arrive en F6 (administration).
 */
import { api } from '../../lib/api';
import {
  parseOrThrow,
  docTypesListSchema,
  tagsListSchema,
  departmentsListSchema,
} from '../../lib/validate';

export const referentialsApi = {
  docTypes: async () => {
    const { data } = await api.get('/doc-types');
    return parseOrThrow(docTypesListSchema, data, 'GET /doc-types').doc_types;
  },

  tags: async () => {
    const { data } = await api.get('/tags');
    return parseOrThrow(tagsListSchema, data, 'GET /tags').tags;
  },

  departments: async () => {
    const { data } = await api.get('/departments');
    return parseOrThrow(departmentsListSchema, data, 'GET /departments').departments;
  },
};
