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
from sqlalchemy import or_

from app.errors import PermissionDeniedError
from app.models.audit import AuditLog
from app.models.document import Document
from app.models.user import UserAccount
from app.scope import is_super_admin
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
# Lecture (P5) — journal intégral, filtrable, borné au périmètre campus
# ---------------------------------------------------------------------------

def _int(params, key, default=None):
    value = params.get(key)
    if value in (None, ''):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _apply_filters(query, params):
    from app.documents.repositories import parse_date

    action = params.get('action')
    if action:
        query = query.filter(AuditLog.action == action)
    object_type = params.get('object_type')
    if object_type:
        query = query.filter(AuditLog.object_type == object_type)
    user_id = _int(params, 'user_id')
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)
    date_from = parse_date(params.get('from') or params.get('date_from'))
    date_to = parse_date(params.get('to') or params.get('date_to'))
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)
    return query


def list_entries(actor, params, since=None):
    """
    Journal filtré et paginé, borné au périmètre (D6) :

    * super admin : tout le journal (`campus_id` optionnel) ;
    * admin de campus : actions de son campus (utilisateur ou document) ;
    * autre utilisateur : ses propres actions uniquement.

    Un admin de campus qui demande un autre campus reçoit un 403.
    """
    query = _apply_filters(AuditLog.query, params)
    if since is not None:
        query = query.filter(AuditLog.created_at >= since)

    if is_super_admin(actor):
        campus_id = _int(params, 'campus_id')
    elif actor.role is not None and actor.role.name == 'Admin':
        if actor.campus_id is None:
            raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                        code='no_campus_scope')
        requested = _int(params, 'campus_id')
        if requested is not None and requested != actor.campus_id:
            raise PermissionDeniedError("Accès inter-campus interdit.",
                                        code='cross_campus_access')
        campus_id = actor.campus_id
    else:
        return query.filter(AuditLog.user_id == actor.user_id)

    if campus_id is not None:
        query = (query
                 .outerjoin(UserAccount,
                            AuditLog.user_id == UserAccount.user_id)
                 .outerjoin(Document,
                            AuditLog.document_id == Document.document_id)
                 .filter(or_(UserAccount.campus_id == campus_id,
                             Document.campus_id == campus_id)))
    return query


def to_csv(actor, params) -> str:
    """Export CSV du journal filtré (même périmètre, plafonné à 10 000 lignes)."""
    import csv
    import io

    params = dict(params)
    params['per_page'] = 10000
    query = list_entries(actor, params)
    rows = query.limit(10000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Action', 'Type objet', 'ID objet', 'Utilisateur',
                     'Document', 'Détails', 'Horodatage'])
    for entry in rows:
        writer.writerow([
            entry.audit_id, entry.action, entry.object_type, entry.object_id,
            entry.user.username if entry.user else None,
            entry.document_id,
            str(entry.details or {}),
            entry.created_at.isoformat() if entry.created_at else None,
        ])
    return output.getvalue()


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
