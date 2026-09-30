"""
Journal d'audit (plan 07 — P0.8).

Objectif : **toute mutation laisse une trace**, sans dépendre de la mémoire de
celui qui écrit la route.

* **Trace explicite** — `audit_service.log(...)` appelée par les services
  (connexions, mots de passe, CRUD utilisateurs). Elle porte l'action métier
  réelle (`user_created`, `logout`, …) et positionne `g.audit_logged`.
* **Filet de sécurité** — un `after_request` trace toute mutation
  (POST/PUT/PATCH/DELETE) **réussie** qui n'a pas déjà été journalisée, avec
  l'action dérivée de l'endpoint (`users.create_user` → `create_user`).

Une route qui oublie d'auditer est donc quand même journalisée, et une route
qui trace déjà n'est pas doublonnée. Échec d'écriture : journalisé côté serveur,
jamais la réponse.

`GET /api/audit` (phase P5) exposera ce journal.
"""

from __future__ import annotations

from typing import Any

from flask import Flask, current_app, g, has_request_context, request

from app.models.audit import AuditLog
from extensions import db

MUTATING_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})

# Type d'objet associé à chaque blueprint (colonnes lisibles dans l'API P5).
OBJECT_TYPES = {
    'auth': 'authentication',
    'users': 'user_account',
}

_UNSET = object()


# ---------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------

def current_user_id() -> int | None:
    """Utilisateur porté par `@session_required`, ou `None` hors requête."""
    if not has_request_context():
        return None
    user = getattr(g, 'current_user', None)
    return user.user_id if user is not None else None


def log(action: str, object_type: str = 'api', *,
        object_id: int | None = None,
        details: dict[str, Any] | None = None,
        user_id: Any = _UNSET) -> AuditLog:
    """
    Écrit une ligne `audit_log` et signale qu'elle a été faite.

    `user_id` : valeur explicite, ou `None` hors requête / pour un acteur
    inconnu (tentative de connexion sur un compte inexistant). N'omettez pas le
    mot-clé `user_id` si vous voulez que l'auteur soit repris du contexte.
    """
    if user_id is _UNSET:
        user_id = current_user_id()

    entry = AuditLog(
        user_id=user_id,
        action=action,
        object_type=object_type,
        object_id=object_id,
        details=details or {},
    )
    db.session.add(entry)
    db.session.commit()

    if has_request_context():
        g.audit_logged = True
    return entry


# ---------------------------------------------------------------------------
# Filet de sécurité (after_request)
# ---------------------------------------------------------------------------

def _object_id_from_view_args() -> int | None:
    """`/users/<int:user_id>` → 3 (heuristique : premier argument entier)."""
    for value in (request.view_args or {}).values():
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    return None


def audit_mutations(response):
    """Trace toute mutation réussie non déjà journalisée par un service."""
    if request.method not in MUTATING_METHODS:
        return response
    # Seules les mutations abouties : les refus (401/403/422) sont déjà
    # couverts par les traces métier (`login_failed`, `permission_denied` en P3).
    if response.status_code >= 400:
        return response
    if getattr(g, 'audit_logged', False):
        return response
    if not request.endpoint:
        return response

    try:
        log(
            action=request.endpoint.split('.')[-1],
            object_type=OBJECT_TYPES.get(request.blueprint or '',
                                          request.blueprint or 'api'),
            object_id=_object_id_from_view_args(),
            details={
                'method': request.method,
                'path': request.path,
                'status': response.status_code,
            },
        )
    except Exception:  # pragma: no cover — jamais bloquer la réponse
        current_app.logger.exception(
            "Écriture d'audit impossible pour %s %s", request.method, request.path
        )
    return response


def register_audit_hook(application: Flask) -> None:
    """Attache le filet de sécurité d'audit à l'application."""
    application.after_request(audit_mutations)
