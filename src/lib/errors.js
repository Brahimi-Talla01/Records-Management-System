/**
 * Couche d'erreurs unique de l'application.
 *
 * Le backend renvoie toujours `{ error, code, details }` (cf. app/errors.py).
 * On ne lit jamais `error` directement dans un composant : on passe par ici,
 * qui traduit un *code stable* en message français + action à proposer.
 */

/** Code stable par statut HTTP (miroir du backend). */
export function codeForStatus(status) {
  return (
    {
      400: 'bad_request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not_found',
      405: 'method_not_allowed',
      409: 'conflict',
      413: 'payload_too_large',
      415: 'unsupported_media_type',
      422: 'unprocessable_entity',
      429: 'too_many_requests',
      500: 'internal_error',
    }[status] || 'error'
  );
}

/**
 * Normalise une erreur (axios ou exception) en objet exploitable par l'UI.
 * @returns {{status?:number, code:string, details:object, message:string, retryable:boolean}}
 */
export function toAppError(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;

  // Erreur réseau (pas de réponse) ou annulation.
  if (!error?.response) {
    const aborted = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';
    return {
      status: undefined,
      code: aborted ? 'request_canceled' : 'network_error',
      details: {},
      message: aborted
        ? 'Requête annulée.'
        : 'Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.',
      retryable: !aborted,
    };
  }

  const code = body?.code || codeForStatus(status);
  const details = body?.details || {};
  const serverMessage = typeof body?.error === 'string' ? body.error : null;

  return {
    status,
    code,
    details,
    message: messageFor(code, serverMessage, details),
    retryable: status >= 500,
  };
}

/** Message français associé à un code (le message serveur n'est qu'un repli). */
export function messageFor(code, serverMessage, details = {}) {
  switch (code) {
    case 'validation_error':
    case 'bad_request': {
      const field = firstField(details);
      return field
        ? `Données invalides : ${field}.`
        : serverMessage || 'Données invalides.';
    }
    case 'unauthorized':
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    case 'forbidden':
      return "Vous n'avez pas les droits pour cette action.";
    case 'cross_campus_access':
      return 'Accès inter-campus interdit : cette ressource appartient à un autre campus.';
    case 'no_campus_scope':
      return "Aucun campus n'est associé à ce compte.";
    case 'not_found':
      return serverMessage || 'Ressource introuvable.';
    case 'conflict':
      return serverMessage || 'Cette ressource est en conflit avec une ressource existante.';
    case 'folder_not_empty':
      return serverMessage ||
        "Dossier non vide : déplacez ou supprimez son contenu avant de le supprimer.";
    case 'folder_cycle':
      return serverMessage ||
        "Déplacement impossible : un dossier ne peut pas être déplacé dans l'un de ses descendants.";
    case 'document_forbidden':
      return serverMessage || "Vous n'avez pas les droits nécessaires sur ce document.";
    case 'preview_not_supported':
      return serverMessage || "Aperçu non disponible pour ce type de fichier.";
    case 'cursor_invalid':
      return 'Pagination expirée : la liste a été réinitialisée à la première page.';
    case 'invalid_pagination':
      return 'Mode de pagination inconnu.';
    case 'payload_too_large':
      return 'Fichier trop volumineux (50 Mo maximum).';
    case 'unsupported_media_type':
      return 'Type de contenu non supporté.';
    case 'unprocessable_entity':
      return serverMessage || "Fichier refusé : extension ou contenu non autorisé.";
    case 'too_many_requests':
    case 'rate_limited':
      return 'Trop de requêtes. Patientez quelques instants avant de réessayer.';
    case 'internal_error':
      return 'Erreur interne du serveur. Réessayez dans un instant.';
    default:
      return serverMessage || 'Une erreur est survenue.';
  }
}

/** Extrait un libellé de champ lisible depuis `details` (objet ou liste). */
export function firstField(details) {
  if (!details || typeof details !== 'object') return null;
  if (Array.isArray(details)) {
    const first = details[0];
    if (typeof first === 'string') return first;
    return first?.field || first?.message || null;
  }
  const keys = Object.keys(details);
  return keys.length ? keys[0] : null;
}

/**
 * Transforme `details` en carte `champ → message` pour les formulaires
 * (react-hook-form). Tolère les formats `{champ: msg}` et `[{field, message}]`.
 */
export function toFieldErrors(details) {
  if (!details || typeof details !== 'object') return {};
  if (Array.isArray(details)) {
    return details.reduce((acc, item) => {
      if (item?.field) acc[item.field] = item.message || 'Champ invalide';
      return acc;
    }, {});
  }
  return Object.entries(details).reduce((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value : 'Champ invalide';
    return acc;
  }, {});
}
