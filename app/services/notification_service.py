"""Notifications in-app (plan 07 — P4).

Création par événements (dépôt de document, droit accordé ; rétention et
alertes de sécurité suivront en P5/P6) et lecture par le destinataire.

Chaque notification appartient à un utilisateur : lecture, marquage et
suppression vérifient toujours `user_id` — 404 sinon (jamais 403, pour ne pas
révéler l'existence d'une notification d'autrui).
"""

from __future__ import annotations

from typing import Iterable

from sqlalchemy import or_

from app.errors import NotFoundError
from app.models.notification import Notification
from app.models.role import Role
from app.models.user import UserAccount
from extensions import db


class NotificationService:

    @staticmethod
    def notify(user_id: int, type_: str, title: str, message: str | None = None,
               action_url: str | None = None) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            action_url=action_url,
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def notify_many(user_ids: Iterable[int | None], type_: str, title: str,
                    message: str | None = None, action_url: str | None = None,
                    exclude: int | None = None) -> int:
        recipients = {uid for uid in user_ids
                      if uid is not None and uid != exclude}
        if not recipients:
            return 0
        db.session.add_all(
            Notification(user_id=uid, type=type_, title=title,
                         message=message, action_url=action_url)
            for uid in recipients
        )
        db.session.commit()
        return len(recipients)

    @staticmethod
    def notify_document_upload(document, actor) -> int:
        """Dépôt d'un document : prévenir les admins du campus + super admins."""
        admins = (UserAccount.query
                  .join(Role, UserAccount.role_id == Role.role_id)
                  .filter(Role.name == 'Admin')
                  .filter(or_(UserAccount.campus_id == document.campus_id,
                              UserAccount.campus_id.is_(None)))
                  .all())
        author = actor.full_name or actor.username
        return NotificationService.notify_many(
            (admin.user_id for admin in admins),
            'document_uploaded',
            'Nouveau document déposé',
            message=f"« {document.title} » a été déposé par {author}.",
            action_url=f"/documents/{document.document_id}",
            exclude=actor.user_id,
        )

    @staticmethod
    def notify_grant(user_id: int | None, granted_by: int | None, what: str,
                     action_url: str | None = None) -> int:
        """Droit accordé : prévenir le bénéficiaire (sauf auto-attribution)."""
        if user_id is None or user_id == granted_by:
            return 0
        return NotificationService.notify_many(
            [user_id], 'permission_granted', 'Nouveau droit accordé',
            message=what, action_url=action_url)

    @staticmethod
    def list_for(user_id: int, unread_only: bool = False,
                 page: int = 1, per_page: int = 20) -> dict:
        query = Notification.query.filter_by(user_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        query = query.order_by(Notification.created_at.desc(),
                               Notification.notification_id.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            'items': [n.to_dict() for n in pagination.items],
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'unread': NotificationService.unread_count(user_id),
        }

    @staticmethod
    def unread_count(user_id: int) -> int:
        return (Notification.query
                .filter_by(user_id=user_id, is_read=False).count())

    @staticmethod
    def _owned(user_id: int, notification_id: int) -> Notification:
        notification = Notification.query.filter_by(
            notification_id=notification_id, user_id=user_id).first()
        if notification is None:
            raise NotFoundError("Notification introuvable.",
                                code='notification_not_found')
        return notification

    @staticmethod
    def mark_read(user_id: int, notification_id: int) -> Notification:
        notification = NotificationService._owned(user_id, notification_id)
        if not notification.is_read:
            notification.is_read = True
            db.session.commit()
        return notification

    @staticmethod
    def mark_all_read(user_id: int) -> int:
        updated = (Notification.query
                   .filter_by(user_id=user_id, is_read=False)
                   .update({'is_read': True}, synchronize_session=False))
        db.session.commit()
        return updated

    @staticmethod
    def delete(user_id: int, notification_id: int) -> None:
        notification = NotificationService._owned(user_id, notification_id)
        db.session.delete(notification)
        db.session.commit()
