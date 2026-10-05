/**
 * Utilitaires de dépôt de fichiers (F4).
 *
 * Les contrôles client **reflètent** ceux du serveur (extension autorisée,
 * taille max) pour refuser un fichier avant l'envoi, sans jamais s'y
 * substituer : le backend reste l'autorité (magic bytes, `413`, `422`).
 */

/** Extension en minuscules sans point (« .PDF » → « pdf »). */
export function fileExtension(name) {
  const value = name || '';
  const dot = value.lastIndexOf('.');
  if (dot <= 0 || dot === value.length - 1) return '';
  return value.slice(dot + 1).toLowerCase();
}

/** Nom de fichier sans son extension (« rapport.pdf » → « rapport »). */
export function fileBaseName(name) {
  const value = name || '';
  const dot = value.lastIndexOf('.');
  return dot > 0 ? value.slice(0, dot) : value;
}

/**
 * Valide un fichier contre les limites serveur.
 * @returns {{ok: boolean, code?: string, message?: string}}
 */
export function validateFile(file, { allowedExtensions = [], maxSizeMb = 50 } = {}) {
  const name = file?.name || '';
  const ext = fileExtension(name);

  if (!ext) {
    return { ok: false, code: 'missing_extension', message: 'Le fichier doit avoir une extension.' };
  }
  if (allowedExtensions.length && !allowedExtensions.includes(ext)) {
    return {
      ok: false,
      code: 'extension_not_allowed',
      message: `Extension « .${ext} » non autorisée.`,
    };
  }
  if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `Fichier trop volumineux (max ${maxSizeMb} Mo).`,
    };
  }
  return { ok: true };
}

/**
 * Pourcentage de progression d'un événement `onUploadProgress` (axios/XHR).
 * `0` quand la taille totale est inconnue (chunked).
 */
export function progressPercent(event) {
  const total = event?.total || 0;
  if (!total) return 0;
  const percent = Math.round((event.loaded / total) * 100);
  return Math.min(100, Math.max(0, percent));
}
