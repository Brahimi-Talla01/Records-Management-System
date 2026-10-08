/**
 * Store Zustand du domaine auth.
 * État client pur : l'utilisateur courant, son statut de chargement.
 * Les données serveur (sessions, etc.) passent par TanStack Query.
 */
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'authenticated' | 'guest'

  setUser: (user) =>
    set({
      user,
      status: user ? 'authenticated' : 'guest',
    }),

  setStatus: (status) => set({ status }),

  clear: () => set({ user: null, status: 'guest' }),
}));
