/**
 * Store Zustand du **périmètre de campus** (A4).
 *
 * Un super admin (`Admin` sans `campus_id`) choisit le campus actif des écrans
 * d'administration ; les autres rôles restent sur leur campus, en lecture
 * seule (aucun filtre modifiable). État client pur — le filtrage réel reste
 * serveur.
 */
import { create } from 'zustand';

export const useCampusStore = create((set) => ({
  campusId: null,
  setCampusId: (campusId) => set({ campusId: campusId ?? null }),
  clear: () => set({ campusId: null }),
}));
