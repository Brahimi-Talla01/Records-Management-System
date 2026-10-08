"""Rétention des documents (plan 07 — P5, §4.7).

Cycle de vie piloté par les réglages `archives.retention_*` :

1. **Préavis** — N jours avant l'échéance (`archives.retention_warning_days`),
   les admins du campus reçoivent une notification `retention_warning`
   (une seule par document et par utilisateur, sauf si
   `notifications.retention_warning` est désactivé sur le campus) ;
2. **Archivage** — à l'échéance, le document actif passe en statut `archived`
   (`archives.retention_auto_archive`) ;
3. **Purge** — N jours après l'échéance (`archives.retention_purge_after_days`),
   le document archivé est supprimé définitivement (fichiers + lignes) ; les
   lignes d'audit attachées sont détachées (historique conservé, référence
   mise à NULL).

`run(dry_run=True)` simule l'exécution sans aucune écriture, hors rapport.
Le job entier est neutralisé si `archives.retention_enabled` est faux.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import or_

from app.models.audit import AuditLog
from app.models.document import Document
from app.models.notification import Notification
from app.models.retention_report import RetentionReport
from app.models.role import Role
from app.models.role_document_right import RoleDocumentRight
from app.models.user import UserAccount
from app.models.user_document_right import UserDocumentRight
from app.services import audit_service
from app.services.notification_service import NotificationService
from app.settings.service import SettingService
from app.storage import get_storage
from extensions import db


class RetentionService:

    @staticmethod
    def _admins(campus_id: int) -> list[UserAccount]:
        return (UserAccount.query
                .join(Role, UserAccount.role_id == Role.role_id)
                .filter(Role.name == 'Admin')
                .filter(or_(UserAccount.campus_id == campus_id,
                            UserAccount.campus_id.is_(None)))
                .all())

    @staticmethod
    def _send_warnings(documents: list[Document], dry_run: bool) -> int:
        sent = 0
        for document in documents:
            if not SettingService.effective('notifications.retention_warning',
                                            document.campus_id):
                continue
            action_url = f"/documents/{document.document_id}"
            for admin in RetentionService._admins(document.campus_id):
                already = (db.session.query(Notification.notification_id)
                           .filter_by(user_id=admin.user_id,
                                      type='retention_warning',
                                      action_url=action_url)
                           .first())
                if already is not None:
                    continue
                if not dry_run:
                    NotificationService.notify(
                        admin.user_id,
                        'retention_warning',
                        'Fin de conservation proche',
                        message=(f"« {document.title} » arrive à échéance le "
                                 f"{document.retention_expires_at:%d/%m/%Y}."),
                        action_url=action_url)
                sent += 1
        return sent

    @staticmethod
    def _archive(documents: list[Document], triggered_by: int | None,
                 dry_run: bool) -> int:
        count = 0
        for document in documents:
            count += 1
            if dry_run:
                continue
            document.status = 'archived'
            audit_service.log('document_archived', 'document',
                              object_id=document.document_id,
                              details={'retention': 'auto'},
                              user_id=triggered_by)
        if not dry_run and documents:
            db.session.commit()
        return count

    @staticmethod
    def _purge(documents: list[Document], triggered_by: int | None,
               dry_run: bool) -> int:
        count = 0
        storage = get_storage()
        for document in documents:
            count += 1
            if dry_run:
                continue
            for version in document.versions.all():
                storage.delete(version.storage_url)
            (UserDocumentRight.query
             .filter_by(document_id=document.document_id)
             .delete(synchronize_session=False))
            (RoleDocumentRight.query
             .filter_by(document_id=document.document_id)
             .delete(synchronize_session=False))
            (AuditLog.query
             .filter_by(document_id=document.document_id)
             .update({'document_id': None}, synchronize_session=False))
            audit_service.log('document_purged', 'document',
                              object_id=None,
                              details={'purged_document_id':
                                       document.document_id,
                                       'title': document.title},
                              user_id=triggered_by)
            db.session.delete(document)
        if not dry_run and count:
            db.session.commit()
        return count

    @staticmethod
    def run(dry_run: bool = False, triggered_by: int | None = None,
            campus_id: int | None = None) -> RetentionReport:
        """Exécute le cycle de rétention et consigne un rapport."""
        now = datetime.utcnow()
        report = RetentionReport(ran_at=now, dry_run=dry_run,
                                 triggered_by=triggered_by, details={})
        db.session.add(report)

        if not SettingService.effective('archives.retention_enabled',
                                        campus_id):
            report.details = {'skipped': 'retention_disabled'}
            db.session.commit()
            return report

        warning_days = int(SettingService.effective(
            'archives.retention_warning_days', campus_id))
        purge_after = int(SettingService.effective(
            'archives.retention_purge_after_days', campus_id))

        base = Document.query.filter(
            Document.retention_expires_at.isnot(None))
        if campus_id is not None:
            base = base.filter(Document.campus_id == campus_id)

        report.warnings_sent = RetentionService._send_warnings(
            base.filter(
                Document.status == 'active',
                Document.retention_expires_at > now,
                Document.retention_expires_at <= now + timedelta(days=warning_days),
            ).all(),
            dry_run=dry_run)

        if SettingService.effective('archives.retention_auto_archive',
                                    campus_id):
            report.archived = RetentionService._archive(
                base.filter(Document.status == 'active',
                            Document.retention_expires_at <= now).all(),
                triggered_by=triggered_by, dry_run=dry_run)

        report.purged = RetentionService._purge(
            base.filter(
                Document.status == 'archived',
                Document.retention_expires_at <= now - timedelta(days=purge_after),
            ).all(),
            triggered_by=triggered_by, dry_run=dry_run)

        db.session.commit()
        return report

    @staticmethod
    def status(campus_id: int | None = None) -> dict:
        """Compteurs de rétention + dernier rapport (aucun effet de bord)."""
        now = datetime.utcnow()
        active = Document.query.filter(
            Document.status == 'active',
            Document.retention_expires_at.isnot(None))
        archived = Document.query.filter(Document.status == 'archived')
        if campus_id is not None:
            active = active.filter(Document.campus_id == campus_id)
            archived = archived.filter(Document.campus_id == campus_id)

        warning_days = int(SettingService.effective(
            'archives.retention_warning_days', campus_id))
        purge_after = int(SettingService.effective(
            'archives.retention_purge_after_days', campus_id))

        last = (RetentionReport.query
                .order_by(RetentionReport.ran_at.desc(),
                          RetentionReport.report_id.desc())
                .first())

        return {
            'enabled': SettingService.effective('archives.retention_enabled',
                                                campus_id),
            'warning_days': warning_days,
            'purge_after_days': purge_after,
            'expiring_soon': active.filter(
                Document.retention_expires_at > now,
                Document.retention_expires_at <= now + timedelta(days=warning_days),
            ).count(),
            'expired_active': active.filter(
                Document.retention_expires_at <= now).count(),
            'archived': archived.count(),
            'purgeable': archived.filter(
                Document.retention_expires_at <= now - timedelta(days=purge_after),
            ).count(),
            'last_report': last.to_dict() if last is not None else None,
        }
