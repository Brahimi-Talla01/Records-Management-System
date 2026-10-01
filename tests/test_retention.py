"""Rétention des documents (plan 07 — P5, §4.7).

Préavis J-N, archivage à l'échéance, purge, dry_run, rapports et API
`/api/admin/retention` (super admin).
"""

import io
from contextlib import contextmanager
from datetime import datetime, timedelta

import pytest

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.notification import Notification
from app.models.role import Role
from app.models.setting import Setting
from app.models.user import UserAccount
from app.services.retention_service import RetentionService
from app.settings.service import SettingService
from app.storage import get_storage
from extensions import db

PDF = b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n'


@pytest.fixture
def principal_id(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert campus is not None
        return campus.campus_id


@pytest.fixture
def second_campus_id(app):
    with app.app_context():
        campus = Campus(code='SUD5', name='Campus Sud 5')
        db.session.add(campus)
        db.session.commit()
        return campus.campus_id


@pytest.fixture
def doc_type_id(app):
    with app.app_context():
        doc_type = DocType.query.filter_by(name='Rapport').first()
        assert doc_type is not None
        return doc_type.doc_type_id


@pytest.fixture
def campus_admin(app, client, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert role is not None and campus is not None
        user = UserAccount(
            matricule='ADMINC7', username='adminc7', email='adminc7@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc7', 'AdminC@2024')


@contextmanager
def db_ctx(session):
    with session.client.application.app_context():
        yield


def create_doc(session, doc_type_id, campus_id, file=None, **fields):
    data = {'title': fields.pop('title', 'Rapport de test'),
            'doc_type_id': str(doc_type_id),
            'campus_id': str(campus_id)}
    for key, value in fields.items():
        data[key] = value if isinstance(value, str) else str(value)
    if file is not None:
        data['file'] = (io.BytesIO(file[0]), file[1])
    return session.post('/api/documents', data=data,
                        content_type='multipart/form-data')


def set_expiry(document_id, delta_days):
    """delta_days en jours par rapport à maintenant (int) ou None."""
    document = get_doc(document_id)
    document.retention_expires_at = (datetime.utcnow() + timedelta(days=delta_days)
                                     if delta_days is not None else None)
    db.session.commit()
    return document


def get_doc(document_id):
    document = db.session.get(Document, document_id)
    assert document is not None
    return document


def first_version_url(document_id):
    version = DocumentVersion.query.filter_by(document_id=document_id).first()
    assert version is not None
    return version.storage_url


# ---------------------------------------------------------------------------
# Cycle de vie (service)
# ---------------------------------------------------------------------------

def test_run_sans_echeance_renvoie_un_rapport_zero(admin, doc_type_id,
                                                   principal_id):
    create_doc(admin, doc_type_id, principal_id)

    report = RetentionService.run()

    assert (report.warnings_sent, report.archived, report.purged) == (0, 0, 0)
    assert report.dry_run is False


def test_preavis_notifie_les_admins_une_seule_fois(admin, doc_type_id,
                                                   principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Bientôt échu').get_json()['document_id']
    set_expiry(doc_id, 10)

    first = RetentionService.run()
    second = RetentionService.run()

    assert first.warnings_sent >= 1
    assert second.warnings_sent == 0
    types = [n.type for n in Notification.query.all()]
    assert types.count('retention_warning') == first.warnings_sent


def test_preavis_desactive_par_le_reglage_du_campus(admin, doc_type_id,
                                                    principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Bientôt échu').get_json()['document_id']
    set_expiry(doc_id, 10)
    SettingService.set_value('notifications.retention_warning', False,
                             scope='campus', campus_id=principal_id)

    report = RetentionService.run()

    assert report.warnings_sent == 0
    assert Notification.query.count() == 0


def test_archivage_a_lecheance(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Échu').get_json()['document_id']
    set_expiry(doc_id, -1)

    report = RetentionService.run()

    assert report.archived == 1
    assert get_doc(doc_id).status == 'archived'
    actions = [a.action for a in AuditLog.query.all()]
    assert 'document_archived' in actions


def test_purge_supprime_document_fichier_et_droits(admin, doc_type_id,
                                                   principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id, title='À purger',
                        file=(PDF, 'purge.pdf')).get_json()['document_id']
    set_expiry(doc_id, -400)
    admin.put(f'/api/permissions/document/{doc_id}/user/{admin.user_id}',
              json={'can_view': True})
    with db_ctx(admin):
        document = get_doc(doc_id)
        document.status = 'archived'
        db.session.commit()
        storage_url = first_version_url(doc_id)
        assert (AuditLog.query
                .filter_by(object_type='document', object_id=doc_id)
                .count() >= 1)

    report = RetentionService.run()

    assert report.purged == 1
    with db_ctx(admin):
        assert db.session.get(Document, doc_id) is None
        assert DocumentVersion.query.filter_by(document_id=doc_id).count() == 0
        assert get_storage().exists(storage_url) is False
        # l'historique d'audit est conservé, la référence au document détachée
        assert (AuditLog.query
                .filter(AuditLog.object_type == 'document',
                        AuditLog.object_id == doc_id,
                        AuditLog.document_id.is_(None))
                .count() >= 1)
        assert AuditLog.query.filter(
            AuditLog.action == 'document_created').count() >= 1
        assert AuditLog.query.filter(
            AuditLog.action == 'document_purged').count() == 1


def test_dry_run_ne_modifie_rien(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id, title='Simulation',
                        file=(PDF, 'a.pdf')).get_json()['document_id']
    set_expiry(doc_id, -400)
    with db_ctx(admin):
        get_doc(doc_id).status = 'archived'
        db.session.commit()
        storage_url = first_version_url(doc_id)

    report = RetentionService.run(dry_run=True)

    assert report.dry_run is True
    assert report.purged == 1
    with db_ctx(admin):
        assert db.session.get(Document, doc_id) is not None
        assert get_storage().exists(storage_url) is True


def test_retention_desactive_neutralise_le_job(admin, doc_type_id,
                                               principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Échu').get_json()['document_id']
    set_expiry(doc_id, -1)
    SettingService.set_value('archives.retention_enabled', False)

    report = RetentionService.run()

    assert report.details == {'skipped': 'retention_disabled'}
    assert get_doc(doc_id).status == 'active'


def test_status_compte_les_echeances(admin, doc_type_id, principal_id):
    soon = create_doc(admin, doc_type_id, principal_id,
                      title='Proche').get_json()['document_id']
    expired = create_doc(admin, doc_type_id, principal_id,
                         title='Échu').get_json()['document_id']
    without = create_doc(admin, doc_type_id, principal_id,
                         title='Sans échéance').get_json()['document_id']
    set_expiry(soon, 5)
    set_expiry(expired, -1)
    set_expiry(without, None)

    status = RetentionService.status()

    assert status['expiring_soon'] == 1
    assert status['expired_active'] == 1
    assert status['archived'] == 0
    assert status['enabled'] is True


def test_run_filtre_par_campus(admin, doc_type_id, principal_id,
                               second_campus_id):
    sud_id = create_doc(admin, doc_type_id, second_campus_id,
                        title='Sud échu').get_json()['document_id']
    principal_doc = create_doc(admin, doc_type_id, principal_id,
                               title='Principal échu').get_json()['document_id']
    set_expiry(sud_id, -1)
    set_expiry(principal_doc, -1)

    report = RetentionService.run(campus_id=second_campus_id)

    assert report.archived == 1
    assert get_doc(sud_id).status == 'archived'
    assert get_doc(principal_doc).status == 'active'


# ---------------------------------------------------------------------------
# API /api/admin/retention
# ---------------------------------------------------------------------------

def test_status_exige_le_super_admin(campus_admin, student):
    assert campus_admin.get('/api/admin/retention/status').status_code == 403
    assert student.get('/api/admin/retention/status').status_code == 403


def test_run_exige_le_super_admin(campus_admin):
    resp = campus_admin.post('/api/admin/retention/run', json={'dry_run': True})

    assert resp.status_code == 403


def test_run_et_rapports_par_le_super_admin(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Échu').get_json()['document_id']
    set_expiry(doc_id, -1)

    resp = admin.post('/api/admin/retention/run', json={'dry_run': True})

    assert resp.status_code == 200
    body = resp.get_json()
    assert body['dry_run'] is True
    assert body['archived'] == 1

    reports = admin.get('/api/admin/retention/reports').get_json()
    assert reports['total'] == 1
    assert reports['items'][0]['archived'] == 1

    status = admin.get('/api/admin/retention/status').get_json()
    assert status['last_report']['archived'] == 1


def test_run_dry_run_ne_modifie_pas(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Échu').get_json()['document_id']
    set_expiry(doc_id, -1)

    admin.post('/api/admin/retention/run', json={'dry_run': True})

    assert get_doc(doc_id).status == 'active'


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def test_cli_retention_status(admin):
    runner = admin.client.application.test_cli_runner()
    result = runner.invoke(args=['retention', 'status'])

    assert result.exit_code == 0, result.output
    assert 'expiring_soon' in result.output


def test_cli_retention_run_dry_run(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Échu').get_json()['document_id']
    set_expiry(doc_id, -1)

    runner = admin.client.application.test_cli_runner()
    result = runner.invoke(args=['retention', 'run', '--dry-run'])

    assert result.exit_code == 0, result.output
    assert 'SIMULATION' in result.output
    assert get_doc(doc_id).status == 'active'
