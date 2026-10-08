"""Notifications in-app (plan 07 — P4, §4.7).

Événements émetteurs (upload de document, droit accordé) et cycle de vie
côté destinataire : badge, liste, marquage lu, suppression.
"""

import io

import pytest

from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.role import Role
from app.models.user import UserAccount
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
        campus = Campus(code='OUEST', name='Campus Ouest')
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
            matricule='ADMINC6', username='adminc6', email='adminc6@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc6', 'AdminC@2024')


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


# ---------------------------------------------------------------------------
# Événements émetteurs
# ---------------------------------------------------------------------------

def test_upload_notifie_les_admins(admin, campus_admin, doc_type_id,
                                   principal_id):
    create_doc(campus_admin, doc_type_id, principal_id, file=(PDF, 'a.pdf'))

    notifications = admin.get('/api/notifications').get_json()
    assert notifications['total'] == 1
    item = notifications['items'][0]
    assert item['type'] == 'document_uploaded'
    assert item['is_read'] is False
    assert 'Rapport de test' in item['message']

    badge = admin.get('/api/notifications/unread-count').get_json()
    assert badge['unread'] == 1


def test_upload_ne_notifie_pas_lauteur(campus_admin, doc_type_id, principal_id):
    create_doc(campus_admin, doc_type_id, principal_id, file=(PDF, 'a.pdf'))

    assert campus_admin.get('/api/notifications').get_json()['total'] == 0


def test_upload_par_super_admin_notifie_l_admin_de_campus(admin, campus_admin,
                                                          doc_type_id,
                                                          principal_id):
    create_doc(admin, doc_type_id, principal_id, file=(PDF, 'a.pdf'))

    notifications = campus_admin.get('/api/notifications').get_json()
    assert notifications['total'] == 1
    assert notifications['items'][0]['type'] == 'document_uploaded'


def test_upload_sans_fichier_ne_notifie_pas(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id)

    assert admin.get('/api/notifications').get_json()['total'] == 0


def test_upload_ne_notifie_pas_les_non_admins(campus_admin, student,
                                              doc_type_id, principal_id):
    create_doc(campus_admin, doc_type_id, principal_id, file=(PDF, 'a.pdf'))

    assert student.get('/api/notifications').get_json()['total'] == 0


def test_upload_notifie_seulement_le_campus_concerne(app, admin, campus_admin,
                                                     do_login, doc_type_id,
                                                     principal_id,
                                                     second_campus_id):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        assert role is not None
        admin_ouest = UserAccount(
            matricule='ADMINOU1', username='adminouest',
            email='adminouest@uniarchive.edu', full_name='Admin Ouest',
            role_id=role.role_id, campus_id=second_campus_id, is_active=True,
        )
        admin_ouest.set_password('Ouest@2024')
        db.session.add(admin_ouest)
        db.session.commit()

    create_doc(admin, doc_type_id, principal_id, file=(PDF, 'a.pdf'))

    assert admin.get('/api/notifications').get_json()['total'] == 0
    assert campus_admin.get('/api/notifications').get_json()['total'] == 1

    session_ouest = do_login('adminouest', 'Ouest@2024')
    assert session_ouest.get('/api/notifications').get_json()['total'] == 0


# ---------------------------------------------------------------------------
# Droits accordés
# ---------------------------------------------------------------------------

def test_grant_document_notifie_le_beneficiaire(admin, student, doc_type_id,
                                                principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'a.pdf')).get_json()['document_id']

    resp = admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
                     json={'can_view': True})
    assert resp.status_code == 200, resp.get_json()

    notifications = student.get('/api/notifications').get_json()
    assert notifications['total'] == 1
    assert notifications['items'][0]['type'] == 'permission_granted'


def test_grant_folder_notifie_le_beneficiaire(admin, student, principal_id):
    resp = admin.post('/api/folders', json={'name': 'Dossier partagé',
                                            'campus_id': principal_id})
    folder_id = resp.get_json()['folder_id']

    admin.put(f'/api/permissions/folder/{folder_id}/user/{student.user_id}',
              json={'can_view': True})

    types = [n['type'] for n in
             student.get('/api/notifications').get_json()['items']]
    assert 'permission_granted' in types


def test_auto_grant_ne_notifie_pas(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']

    admin.put(f'/api/permissions/document/{doc_id}/user/{admin.user_id}',
              json={'can_view': True})

    assert admin.get('/api/notifications').get_json()['total'] == 0


def test_regrant_ne_renotifie_pas(admin, student, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_view': True})

    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_download': True})

    assert student.get('/api/notifications').get_json()['total'] == 1


def test_revoke_ne_notifie_pas(admin, student, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_view': True})

    admin.delete(f'/api/permissions/document/{doc_id}/user/{student.user_id}')

    assert student.get('/api/notifications').get_json()['total'] == 1


# ---------------------------------------------------------------------------
# Cycle de vie côté destinataire
# ---------------------------------------------------------------------------

def test_liste_filtre_les_non_lues(admin, student, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_view': True})

    data = student.get('/api/notifications?unread=1').get_json()
    assert data['total'] == 1

    notification_id = data['items'][0]['notification_id']
    resp = student.patch(f'/api/notifications/{notification_id}/read')
    assert resp.status_code == 200
    assert resp.get_json()['is_read'] is True

    assert student.get('/api/notifications?unread=1').get_json()['total'] == 0
    assert student.get('/api/notifications').get_json()['total'] == 1


def test_read_all(admin, student, doc_type_id, principal_id):
    for index in range(2):
        doc_id = create_doc(admin, doc_type_id,
                            principal_id).get_json()['document_id']
        admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
                  json={'can_view': True})

    student.get('/api/notifications/unread-count')

    resp = student.post('/api/notifications/read-all')
    assert resp.status_code == 200
    assert resp.get_json()['updated'] == 2
    assert student.get('/api/notifications/unread-count').get_json()['unread'] == 0


def test_suppression_par_le_destinataire(admin, student, doc_type_id,
                                         principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_view': True})
    notification_id = (student.get('/api/notifications')
                       .get_json()['items'][0]['notification_id'])

    resp = student.delete(f'/api/notifications/{notification_id}')
    assert resp.status_code == 200
    assert student.get('/api/notifications').get_json()['total'] == 0

    assert student.delete(
        f'/api/notifications/{notification_id}').status_code == 404


def test_notification_d_autrui_inaccessible(admin, student, doc_type_id,
                                             principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    admin.put(f'/api/permissions/document/{doc_id}/user/{student.user_id}',
              json={'can_view': True})
    notification_id = (student.get('/api/notifications')
                       .get_json()['items'][0]['notification_id'])

    assert admin.patch(
        f'/api/notifications/{notification_id}/read').status_code == 404
    assert admin.delete(
        f'/api/notifications/{notification_id}').status_code == 404


def test_mutations_exigent_csrf(student):
    resp = student.without_csrf().post('/api/notifications/read-all')

    assert resp.status_code == 403
    student.client.environ_base['HTTP_X_CSRF_TOKEN'] = student.csrf_token
