"""Périmètre multi-campus : super admin, filtrage par campus, garde inter-campus."""

from __future__ import annotations

from typing import Any

from flask import g
from sqlalchemy import or_

from app.errors import PermissionDeniedError

_UNSET = object()


def is_super_admin(user) -> bool:
    return bool(user is not None and user.role is not None
                and user.role.name == 'Admin' and user.campus_id is None)


def current_campus_id() -> int | None:
    return getattr(g, 'current_campus_id', None)


def set_campus_context(user) -> None:
    g.current_campus_id = user.campus_id if user is not None else None


def resolve_campus_id(user, requested: Any = None) -> int | None:
    requested = int(requested) if requested not in (None, '') else None
    if is_super_admin(user):
        return requested
    if user.campus_id is None:
        raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                    code='no_campus_scope')
    if requested is not None and requested != user.campus_id:
        raise PermissionDeniedError(
            "Accès inter-campus interdit.",
            code='cross_campus_access',
            details={'requested_campus_id': requested,
                     'user_campus_id': user.campus_id},
        )
    return user.campus_id


def require_campus_access(user, campus_id: int | None) -> None:
    if is_super_admin(user):
        return
    if user.campus_id is None:
        raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                    code='no_campus_scope')
    if campus_id is not None and campus_id != user.campus_id:
        raise PermissionDeniedError("Accès inter-campus interdit.",
                                    code='cross_campus_access')


def apply_campus_scope(query, model, *, campus_id=_UNSET, include_global: bool = False):
    user = getattr(g, 'current_user', None)

    if campus_id is _UNSET:
        campus_id = user.campus_id if user is not None else None

    if is_super_admin(user) and campus_id is None:
        return query

    if campus_id is None:
        raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                    code='no_campus_scope')

    if include_global:
        return query.filter(or_(model.campus_id == campus_id,
                                model.campus_id.is_(None)))
    return query.filter(model.campus_id == campus_id)
