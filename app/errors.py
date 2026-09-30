"""
Enveloppe d'erreur standardisée (plan 07 — P0.4).

Contrat (D8) :

    {"error": "message", "code": "SNAKE_CASE", "details": {…}}

* `error` est et **restera** une chaîne : c'est la valeur que le frontend lit
  (`err.response?.data?.error`) — un objet ici casserait l'écran de login.
* `code` est **stable** : c'est ce que les tests et le frontend testent
  (jamais le texte, qui peut être reformulé).
* `details` porte les champs fautifs (validation) ou le contexte de débogage.

Deux façons de produire l'enveloppe :

1. **Explicite** — `error_response(...)` dans une route, ou `raise NotFoundError(...)`
   dans un service (les exceptions sont interceptées par les handlers).
2. **Garantie** — `register_error_handlers()` couvre `HTTPException` et `AppError`,
   puis un `after_request` complète les réponses `{"error": str}` produites par des
   routes anciennes : toutes les erreurs ont les 3 clés, sans toucher à 60 `jsonify`.
"""

from __future__ import annotations

import json
import traceback

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

# ---------------------------------------------------------------------------
# Codes stables par statut HTTP
# ---------------------------------------------------------------------------

STATUS_CODES: dict[int, str] = {
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
}

# Messages servis quand le texte par défaut de Werkzeug (anglais) ne serait
# pas exploitable par un utilisateur final.
DEFAULT_MESSAGES: dict[int, str] = {
    400: 'Requête invalide',
    401: 'Authentification requise',
    403: 'Accès interdit',
    404: 'Ressource non trouvée',
    405: 'Méthode non autorisée',
    409: 'Conflit sur la ressource',
    413: 'Fichier trop volumineux',
    415: 'Type de contenu non supporté',
    422: 'Données invalides',
    429: 'Trop de requêtes. Veuillez patienter.',
    500: 'Erreur interne du serveur',
}


def code_for_status(status: int) -> str:
    """Code stable associé à un statut HTTP (inconnu → `error`)."""
    return STATUS_CODES.get(int(status), 'error')


def envelope(message: str, status: int, code: str | None = None,
             details: dict | None = None) -> dict:
    """Construit le corps JSON de l'enveloppe (toujours les 3 clés)."""
    return {
        'error': message,
        'code': code or code_for_status(status),
        'details': details if details is not None else {},
    }


def error_response(message: str, status: int = 400, code: str | None = None,
                   details: dict | None = None):
    """Réponse d'erreur uniforme : `(jsonify(...), status)`."""
    return jsonify(envelope(message, status, code, details)), status


# ---------------------------------------------------------------------------
# Exceptions métier (levées dans les services, interceptées par les handlers)
# ---------------------------------------------------------------------------

class AppError(Exception):
    """Exception de base : porte message, statut, code stable et détails."""

    status_code = 400
    code = 'app_error'
    default_message = 'Requête invalide'

    def __init__(self, message: str | None = None, *,
                 code: str | None = None,
                 status_code: int | None = None,
                 details: dict | None = None):
        message = message or self.default_message
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details or {}

    def to_dict(self) -> dict:
        return envelope(self.message, self.status_code, self.code, self.details)

    def to_response(self):
        return jsonify(self.to_dict()), self.status_code

    def __str__(self) -> str:  # pragma: no cover — lisibilité des traces
        return self.message


class ValidationError(AppError):
    status_code = 400
    code = 'validation_error'
    default_message = 'Données invalides'


class AuthenticationError(AppError):
    status_code = 401
    code = 'unauthorized'
    default_message = 'Authentification requise'


class PermissionDeniedError(AppError):
    status_code = 403
    code = 'forbidden'
    default_message = 'Accès interdit'


class NotFoundError(AppError):
    status_code = 404
    code = 'not_found'
    default_message = 'Ressource non trouvée'


class ConflictError(AppError):
    """Ressource en conflit (matricule / username / email déjà utilisés)."""
    status_code = 409
    code = 'conflict'
    default_message = 'Conflit sur la ressource'


class PayloadTooLargeError(AppError):
    status_code = 413
    code = 'payload_too_large'
    default_message = 'Fichier trop volumineux'


class UnprocessableEntityError(AppError):
    status_code = 422
    code = 'unprocessable_entity'
    default_message = 'Données invalides'


class TooManyRequestsError(AppError):
    status_code = 429
    code = 'too_many_requests'
    default_message = 'Trop de requêtes. Veuillez patienter.'


class InternalError(AppError):
    status_code = 500
    code = 'internal_error'
    default_message = 'Erreur interne du serveur'


# ---------------------------------------------------------------------------
# Normalisation : toute réponse d'erreur JSON porte les 3 clés
# ---------------------------------------------------------------------------

def complete_error_envelope(response):
    """
    `after_request` — complète `{"error": "…"}` par `code` + `details`.

    Idempotent : les corps qui possèdent déjà `code` (produits explicitement par
    `error_response()` ou les handlers) ne sont pas touchés. Les réponses de
    succès sont ignorées.
    """
    if response.status_code < 400:
        return response

    body = response.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get('error'), str):
        return response
    if 'code' in body and 'details' in body:
        return response

    body.setdefault('code', code_for_status(response.status_code))
    body.setdefault('details', {})
    response.set_data(json.dumps(body, ensure_ascii=False))
    return response


# ---------------------------------------------------------------------------
# Enregistrement
# ---------------------------------------------------------------------------

def register_error_handlers(application: Flask) -> None:
    """
    Attache à l'application :
    * les handlers `AppError` / `HTTPException` / `Exception` ;
    * l'`after_request` de normalisation de l'enveloppe.
    """

    @application.errorhandler(AppError)
    def _handle_app_error(exc: AppError):
        return exc.to_response()

    @application.errorhandler(HTTPException)
    def _handle_http_error(exc: HTTPException):
        status = exc.code or 500
        message = DEFAULT_MESSAGES.get(status) or exc.description or 'Erreur'
        return error_response(message, status)

    @application.errorhandler(Exception)
    def _handle_unexpected(exc: Exception):
        # Trace complète côté serveur (jamais exposée au client).
        application.logger.error(
            'Erreur non gérée : %s\n%s', exc, traceback.format_exc()
        )
        return error_response(DEFAULT_MESSAGES[500], 500)

    application.after_request(complete_error_envelope)
