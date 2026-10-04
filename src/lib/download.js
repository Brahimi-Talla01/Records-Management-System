/**
 * Téléchargement de fichiers binaires côté client.
 *
 * Le backend renvoie des `blob` (aperçu, téléchargement de version, export CSV) :
 * on lit la réponse en binaire, on fabrique une URL temporaire, on déclenche
 * l'enregistrement via une ancre, puis on **révoque** l'URL (fuite mémoire sinon).
 */
import { api } from './api';

/** Extrait un nom de fichier sûr depuis `Content-Disposition` (RFC 5987 compris). */
export function filenameFromDisposition(header, fallback = 'fichier') {
  if (!header || typeof header !== 'string') return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]).trim() || fallback;
    } catch {
      /* encodage illisible → repli sur le nom simple */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

/** Retire tout chemin et caractère dangereux d'un nom de fichier. */
export function safeFilename(name, fallback = 'fichier') {
  const base = String(name || '').split(/[\\/]/).pop() || '';
  // eslint-disable-next-line no-control-regex -- intentionnel : vider les caractères de contrôle
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim();
  return cleaned || fallback;
}

/** Déclenche l'enregistrement d'un Blob dans le navigateur. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Révocation différée : Firefox a besoin que l'événement click soit traité.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Télécharge `path` (relatif à l'API) en binaire et l'enregistre.
 * `fallbackName` sert si le serveur n'envoie pas `Content-Disposition`.
 */
export async function downloadFromApi(path, fallbackName, config = {}) {
  const response = await api.get(path, { responseType: 'blob', ...config });
  const filename = filenameFromDisposition(
    response.headers?.['content-disposition'],
    fallbackName
  );
  saveBlob(response.data, filename);
  return filename;
}
