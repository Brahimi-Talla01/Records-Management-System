"""Consultation du journal d'audit (plan 07 — P5, §4.7).

API `GET /api/audit` + export CSV : pagination, filtres et périmètre D6
(super admin = tout, admin de campus = son campus, utilisateur = ses actions).
"""

import csv
import io

import pytest

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.role import Role
from app.models.user import UserAccount
from extensions import db


@pytest.fixture
def doc_type_id(app):
    doc_type = DocType.query.filter_by(name='Rapport').one()
    return doc_type.doc_type_id


@pytest.fixture
def principal_id(app):
    campus = Campus.query.filter_by(code='PRINCIPAL').one()
    return campus.campus_id


@pytest.fixture
def second_campus_id(app):
    campus = Campus(code='SUD6', name='Campus Sud 6')
    db.session.add(campus)
    db.session.commit()
    return campus.campus_id


@pytest.fixture
def campus_admin(app, client, do_login):
    role = Role.query.filter_by(name='Admin').one()
    campus = Campus.query.filter_by(code='PRINCIPAL').one()
    user = UserAccount(matricule='ADMINA9', username='admin.audit',
                       email='admin.audit@uniarchive.edu',
                       full_name='Admin Audit', role_id=role.role_id,
                       campus_id=campus.campus_id, is_active=True)
    user.set_password('AdminA@2024')
    db.session.add(user)
    db.session.commit()
    return do_login('admin.audit', 'AdminA@2024')


# ---------------------------------------------------------------------------
# Accès
# ---------------------------------------------------------------------------

def test_journal_exige_une_session_admin(client, student):
    assert client.get('/api/audit').status_code == 401
    assert student.get('/api/audit').status_code == 403
    assert student.get('/api/audit/export').status_code == 403


# ---------------------------------------------------------------------------
# Liste : pagination et filtres
# ---------------------------------------------------------------------------

def _prof_payload(i=0):
    return {
        'matricule': f'PROF77{i}',
        'username': f'prof.audit.{i}',
        'email': f'prof.audit.{i}@uniarchive.edu',
        'full_name': 'Prof Audit',
        'role_id': Role.query.filter_by(name='Prof').one().role_id,
        'password': 'ProfTest@2026',
    }


def test_liste_paginee_et_filtree(admin):
    admin.post('/api/users', json=_prof_payload())

    resp = admin.get('/api/audit?action=user_created')

    assert resp.status_code == 200
    body = resp.get_json()
    assert body['total'] == 1
    entry = body['items'][0]
    assert entry['action'] == 'user_created'
    assert entry['object_type'] == 'user_account'
    assert entry['details']['username'] == 'prof.audit.0'
    assert entry['user']['username'] == 'admin'


def test_filtre_par_utilisateur(admin):
    admin.post('/api/users', json=_prof_payload())
    prof_id = UserAccount.query.filter_by(username='prof.audit.0').one().user_id

    body = admin.get(f'/api/audit?user_id={prof_id}').get_json()

    assert body['total'] == 0  # le profil créé n'a encore rien fait


def test_filtre_par_dates(admin):
    body = admin.get('/api/audit?from=2100-01-01').get_json()

    assert body['total'] == 0


def test_pagination_limite_les_items(admin):
    for i in range(3):
        admin.post('/api/users', json=_prof_payload(i))

    body = admin.get('/api/audit?action=user_created&per_page=2&page=2').get_json()

    assert body['total'] == 3
    assert body['pages'] == 2
    assert len(body['items']) == 1


# ---------------------------------------------------------------------------
# Périmètre D6
# ---------------------------------------------------------------------------

def test_admin_campus_scope_son_campus(campus_admin, doc_type_id,
                                        principal_id):
    # Un document créé par l'admin de campus : trace rattachée à son compte
    campus_admin.post('/api/documents', data={
        'title': 'Doc audit', 'doc_type_id': str(doc_type_id),
        'campus_id': str(principal_id),
        'file': (io.BytesIO(b'%PDF-1.4 fake'), 'audit.pdf'),
    }, content_type='multipart/form-data')

    body = campus_admin.get('/api/audit').get_json()

    assert body['total'] >= 1
    for entry in body['items']:
        assert entry['user']['user_id'] == campus_admin.user_id
    actions = {entry['action'] for entry in body['items']}
    assert 'document_created' in actions


def test_admin_campus_refuse_un_autre_campus(campus_admin, second_campus_id):
    resp = campus_admin.get(f'/api/audit?campus_id={second_campus_id}')

    assert resp.status_code == 403
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_super_admin_filtre_par_campus(admin, second_campus_id):
    second = Campus.query.get(second_campus_id)
    assert second is not None
    role = Role.query.filter_by(name='Etudiant').one()
    user = UserAccount(matricule='ETU-SUD', username='etu.sud',
                       email='etu.sud@uniarchive.edu', full_name='Étudiant Sud',
                       role_id=role.role_id, campus_id=second.campus_id,
                       is_active=True)
    user.set_password('EtuSud@2024')
    db.session.add(user)
    db.session.commit()
    db.session.add(AuditLog(action='login', object_type='authentication',
                            user_id=user.user_id))
    db.session.commit()

    body = admin.get(f'/api/audit?campus_id={second_campus_id}').get_json()

    assert body['total'] == 1
    assert body['items'][0]['user']['username'] == 'etu.sud'


# ---------------------------------------------------------------------------
# Export CSV
# ---------------------------------------------------------------------------

def test_export_csv(admin):
    admin.post('/api/users', json=_prof_payload())

    resp = admin.get('/api/audit/export?action=user_created')

    assert resp.status_code == 200
    assert resp.mimetype == 'text/csv'
    assert 'attachment' in resp.headers.get('Content-Disposition', '')
    rows = list(csv.reader(io.StringIO(resp.get_data(as_text=True))))
    assert rows[0][0] == 'ID'
    assert len(rows) == 2  # en-tête + la création du profil
    assert rows[1][1] == 'user_created'


def test_export_respecte_le_perimetre_campus(campus_admin, second_campus_id):
    resp = campus_admin.get(f'/api/audit/export?campus_id={second_campus_id}')

    assert resp.status_code == 403
