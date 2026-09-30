"""
Authentification par session opaque.

- `@session_required` : vérifie le cookie de session, charge l'utilisateur,
  valide le token CSRF sur les méthodes mutantes (POST/PUT/PATCH/DELETE).
- `current_user` : utilisateur chargé par le décorateur (context-local).
- CSRF : double-submit strict — le token de session doit être renvoyé dans le
  header `X-CSRF-Token` sur les mutations (le cookie seul ne suffit jamais).
"""

from functools import wraps

from flask import request, jsonify, g, current_app

from app.models.user import UserAccount
from app.services import session_service


def _error(message, status):
    return jsonify({'error': message}), status


def _is_mutating_request():
    return request.method in ('POST', 'PUT', 'PATCH', 'DELETE')


def _validate_csrf():
    """
    Double-submit strict : le header doit correspondre au csrf_token stocké
    en session. Le cookie seul ne suffit JAMAIS (sinon un attaquant CSRF
    benefiting du fait que le navigateur envoie le cookie automatiquement).
    """
    header_name = current_app.config['CSRF_HEADER_NAME']
    token = request.headers.get(header_name)
    if not token:
        return False
    return secrets_compare(token, g.session_payload.get('csrf_token', ''))


def secrets_compare(a, b):
    """Comparaison à temps constant."""
    import hmac
    return hmac.compare_digest(str(a), str(b))


def load_session():
    """
    Charge la session depuis le cookie et l'utilisateur associé.
    Retourne (user, payload) ou (None, None).
    """
    cookie_name = current_app.config['SESSION_COOKIE_NAME']
    session_id = request.cookies.get(cookie_name)
    if not session_id:
        return None, None

    payload = session_service.get_session(session_id)
    if payload is None:
        return None, None

    user = UserAccount.query.get(payload.get('user_id'))
    if user is None or not user.is_active:
        # Session orpheline ou compte désactivé : révoquer
        session_service.revoke_session(session_id)
        return None, None

    return user, payload


def session_required(fn):
    """Décorateur d'authentification par session (remplace @jwt_required)."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user, payload = load_session()
        if user is None:
            return _error('Authentification requise', 401)

        g.current_user = user
        g.session_payload = payload

        if _is_mutating_request() and not _validate_csrf():
            return _error('Token CSRF invalide ou manquant', 403)

        return fn(*args, **kwargs)

    return wrapper


def get_current_user() -> UserAccount:
    """
    Utilisateur chargé par @session_required (à utiliser dans les routes).

    Jamais None dans une route décorée : si `g.current_user` n'est pas posé,
    c'est que le décorateur a été oublié → erreur de programmation explicite
    plutôt qu'un `AttributeError: 'NoneType'` au milieu de la route.
    """
    user = getattr(g, 'current_user', None)
    if user is None:
        raise RuntimeError(
            'get_current_user() appelé hors @session_required : '
            'ajoutez @session_required sur cette route.'
        )
    return user


def get_session_id():
    """ID de session brut (cookie), pour la révocation au logout."""
    return request.cookies.get(current_app.config['SESSION_COOKIE_NAME'])
