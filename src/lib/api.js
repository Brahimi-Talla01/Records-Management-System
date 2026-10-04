/**
 * Client HTTP unique de l'application.
 * - envoie les cookies de session (withCredentials)
 * - ajoute le header CSRF (double-submit) sur les mutations
 * - redirige vers /login sur 401
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const CSRF_COOKIE_NAME = 'uniarchive_csrf';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // envoie/reçoit les cookies de session
});
// Aucun `Content-Type` par défaut : axios pose `application/json` pour un
// objet et laisse le navigateur poser `multipart/form-data; boundary=…` pour
// un `FormData` (dépôt de fichiers, F4).

// Header CSRF sur toutes les méthodes mutantes
api.interceptors.request.use((config) => {
  const mutating = ['post', 'put', 'patch', 'delete'].includes(
    (config.method || '').toLowerCase()
  );
  if (mutating) {
    const csrf = getCookie(CSRF_COOKIE_NAME);
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

// 401 => session morte, retour au login (sauf si on y est déjà)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCheck = url.includes('/auth/me');
    if (status === 401 && !isAuthCheck && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
