"""Tableau de bord (plan 07 — P4, §4.6).

Cinq agrégats, tous bornés au périmètre campus (D6) :

* `summary`          — totaux, répartition par statut / département, stockage,
                       échéances proches, compteurs personnels (`me`) ;
* `activity`         — journal d'audit récent (tout le campus pour un admin,
                       ses propres actions pour un utilisateur) ;
* `expiring`         — documents actifs dont la rétention expire sous N jours
                       (échéance dépassée incluse, flag `overdue`) ;
* `uploads`          — dépôts par mois (zéro rempli, portable) ;
* `recent_documents` — derniers documents actifs du périmètre.

Super admin : `campus_id` optionnel (absent → tous les campus). Les autres
rôles sont verrouillés sur leur campus (403 sinon).
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, or_

from app.errors import PermissionDeniedError
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.document import Document
from app.models.user import UserAccount
from app.scope import is_super_admin
from app.serializers import parse_pagination
from app.services.notification_service import NotificationService


def _int(params, key, default):
    value = params.get(key)
    if value in (None, ''):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _bounded(value, default, maximum):
    return min(max(value or default, 1), maximum)


class DashboardService:

    @staticmethod
    def _campus_scope(actor, params) -> int | None:
        requested = _int(params, 'campus_id', None)
        if is_super_admin(actor):
            return requested
        if actor.campus_id is None:
            raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                        code='no_campus_scope')
        if requested is not None and requested != actor.campus_id:
            raise PermissionDeniedError("Accès inter-campus interdit.",
                                        code='cross_campus_access')
        return actor.campus_id

    @staticmethod
    def _role(actor) -> str:
        if is_super_admin(actor):
            return 'super_admin'
        if actor.role is not None and actor.role.name == 'Admin':
            return 'campus_admin'
        return 'user'

    @staticmethod
    def _base(actor, params):
        campus_id = DashboardService._campus_scope(actor, params)
        query = Document.query
        if campus_id is not None:
            query = query.filter(Document.campus_id == campus_id)
        return campus_id, query

    @staticmethod
    def summary(actor, params) -> dict:
        campus_id, base = DashboardService._base(actor, params)
        active = base.filter(Document.status == 'active')

        total = base.count()
        storage = active.with_entities(
            func.coalesce(func.sum(Document.size_bytes), 0)).scalar()
        by_status = dict(base.with_entities(
            Document.status, func.count(Document.document_id)
        ).group_by(Document.status).all())

        dept_rows = (active.with_entities(
            Document.department_id, func.count(Document.document_id))
            .group_by(Document.department_id).all())
        dept_ids = [row[0] for row in dept_rows if row[0] is not None]
        names = {}
        if dept_ids:
            names = {d.department_id: d.name for d in
                     Department.query.filter(
                         Department.department_id.in_(dept_ids)).all()}
        by_department = [
            {'department_id': row[0], 'name': names.get(row[0]), 'count': row[1]}
            for row in sorted(dept_rows, key=lambda r: -r[1])
            if row[0] is not None
        ][:10]

        now = datetime.utcnow()
        month_ago = now - timedelta(days=30)
        horizon = now + timedelta(days=30)
        uploads_30d = base.filter(Document.created_at >= month_ago).count()
        expiring_30d = active.filter(
            Document.retention_expires_at.isnot(None),
            Document.retention_expires_at <= horizon).count()

        my_uploads = (AuditLog.query
                      .filter(AuditLog.user_id == actor.user_id,
                              AuditLog.created_at >= month_ago,
                              AuditLog.action.in_(
                                  ('document_created', 'document_version_added')))
                      .count())

        return {
            'role': DashboardService._role(actor),
            'campus_id': campus_id,
            'totals': {
                'documents': total,
                'active': by_status.get('active', 0),
                'deleted': by_status.get('deleted', 0),
                'storage_bytes': int(storage or 0),
            },
            'by_status': by_status,
            'by_department': by_department,
            'recent': {'uploads': uploads_30d, 'expiring': expiring_30d},
            'me': {
                'unread_notifications': NotificationService.unread_count(
                    actor.user_id),
                'uploads_30d': my_uploads,
            },
        }

    @staticmethod
    def activity(actor, params) -> dict:
        days = _bounded(_int(params, 'days', 30), 30, 365)
        since = datetime.utcnow() - timedelta(days=days)
        query = (AuditLog.query
                 .filter(AuditLog.created_at >= since)
                 .order_by(AuditLog.created_at.desc(),
                           AuditLog.audit_id.desc()))

        if DashboardService._role(actor) == 'user':
            query = query.filter(AuditLog.user_id == actor.user_id)
        else:
            campus_id = DashboardService._campus_scope(actor, params)
            if campus_id is not None:
                query = (query
                         .outerjoin(UserAccount,
                                    AuditLog.user_id == UserAccount.user_id)
                         .outerjoin(Document,
                                    AuditLog.document_id == Document.document_id)
                         .filter(or_(
                             UserAccount.campus_id == campus_id,
                             Document.campus_id == campus_id)))

        page, per_page = parse_pagination(params)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            'items': [entry.to_dict() for entry in pagination.items],
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'days': days,
        }

    @staticmethod
    def expiring(actor, params) -> dict:
        days = _bounded(_int(params, 'days', 30), 30, 365)
        _, base = DashboardService._base(actor, params)
        now = datetime.utcnow()
        horizon = now + timedelta(days=days)
        query = (base
                 .filter(Document.status == 'active')
                 .filter(Document.retention_expires_at.isnot(None),
                         Document.retention_expires_at <= horizon)
                 .order_by(Document.retention_expires_at.asc()))
        page, per_page = parse_pagination(params)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        items = []
        for document in pagination.items:
            data = document.to_dict()
            data['overdue'] = document.retention_expires_at < now
            items.append(data)
        return {
            'items': items,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'days': days,
        }

    @staticmethod
    def uploads(actor, params) -> dict:
        months = _bounded(_int(params, 'months', 12), 12, 24)
        _, base = DashboardService._base(actor, params)

        now = datetime.utcnow()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0,
                                     microsecond=0)
        months_back = months - 1
        month = first_of_month
        for _ in range(months_back):
            month = (month - timedelta(days=1)).replace(day=1)
        start = month

        rows = (base.filter(Document.created_at >= start)
                .with_entities(Document.created_at, Document.size_bytes).all())

        buckets: dict[tuple[int, int], dict] = {}
        cursor = start
        for _ in range(months):
            buckets[(cursor.year, cursor.month)] = {
                'month': f'{cursor.year:04d}-{cursor.month:02d}',
                'count': 0,
                'bytes': 0,
            }
            cursor = (cursor + timedelta(days=32)).replace(day=1)

        for created_at, size_bytes in rows:
            key = (created_at.year, created_at.month)
            if key in buckets:
                buckets[key]['count'] += 1
                buckets[key]['bytes'] += int(size_bytes or 0)

        return {'months': list(buckets.values()), 'months_count': months}

    @staticmethod
    def recent_documents(actor, params) -> dict:
        _, base = DashboardService._base(actor, params)
        limit = _bounded(_int(params, 'limit', 10), 10, 50)
        documents = (base.filter(Document.status == 'active')
                     .order_by(Document.created_at.desc(),
                               Document.document_id.desc())
                     .limit(limit).all())
        return {'items': [d.to_dict() for d in documents], 'limit': limit}
