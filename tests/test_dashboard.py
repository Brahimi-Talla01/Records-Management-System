"""Tableau de bord (plan 07 — P4, §4.6).

Agrégats bornés au campus (D6) et adaptés au rôle.
"""

import io
from datetime import datetime, timedelta

import pytest

from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
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
        campus = Campus(code='EST', name='Campus Est')
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
def info_department_id(app):
    with app.app_context():
        department = Department.query.filter_by(code='INFO').first()
        assert department is not None
        return department.department_id


@pytest.fixture
def campus_admin(app, client, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert role is not None and campus is not None
        user = UserAccount(
            matricule='ADMINC5', username='adminc5', email='adminc5@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc5', 'AdminC@2024')


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
# Summary
# ---------------------------------------------------------------------------

def test_summary_exige_une_session(client):
    assert client.get('/api/dashboard/summary').status_code == 401


def test_summary_super_admin(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Un')
    create_doc(admin, doc_type_id, principal_id, title='Deux')

    data = admin.get('/api/dashboard/summary').get_json()

    assert data['role'] == 'super_admin'
    assert data['campus_id'] is None
    assert data['totals']['documents'] == 2
    assert data['totals']['active'] == 2
    assert data['by_status'] == {'active': 2}
    assert data['me']['unread_notifications'] == 0


def test_summary_stockage_et_uploads_recents(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Avec fichier',
               file=(PDF, 'rapport.pdf'))

    data = admin.get('/api/dashboard/summary').get_json()

    assert data['totals']['storage_bytes'] == len(PDF)
    assert data['recent']['uploads'] == 1
    assert data['me']['uploads_30d'] >= 1


def test_summary_scope_par_campus_pour_super_admin(admin, doc_type_id,
                                                   principal_id,
                                                   second_campus_id):
    create_doc(admin, doc_type_id, principal_id, title='Principal')
    create_doc(admin, doc_type_id, second_campus_id, title='Est')

    data = admin.get(
        f'/api/dashboard/summary?campus_id={second_campus_id}').get_json()

    assert data['campus_id'] == second_campus_id
    assert data['totals']['documents'] == 1


def test_summary_admin_de_campus(admin, campus_admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Principal')

    data = campus_admin.get('/api/dashboard/summary').get_json()

    assert data['role'] == 'campus_admin'
    assert data['campus_id'] == principal_id
    assert data['totals']['documents'] == 1


def test_summary_admin_campus_autre_campus_refuse(campus_admin,
                                                  second_campus_id):
    resp = campus_admin.get(f'/api/dashboard/summary?campus_id={second_campus_id}')

    assert resp.status_code == 403


def test_summary_par_departement(admin, doc_type_id, principal_id,
                                 info_department_id):
    create_doc(admin, doc_type_id, principal_id, title='Info',
               department_id=info_department_id)

    data = admin.get('/api/dashboard/summary').get_json()

    departments = {d['name']: d['count'] for d in data['by_department']}
    assert departments.get('Informatique') == 1


def test_summary_document_supprime_compte_a_part(admin, doc_type_id,
                                                 principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='À supprimer').get_json()['document_id']
    admin.delete(f'/api/documents/{doc_id}')

    data = admin.get('/api/dashboard/summary').get_json()

    assert data['totals']['documents'] == 1
    assert data['totals']['active'] == 0
    assert data['totals']['deleted'] == 1
    assert data['totals']['storage_bytes'] == 0


# ---------------------------------------------------------------------------
# Expiring
# ---------------------------------------------------------------------------

def test_expiring_documents_proches_de_lecheance(admin, doc_type_id,
                                                 principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Bientôt échu',
               retention_period=10)

    data = admin.get('/api/dashboard/expiring').get_json()

    assert data['total'] == 1
    assert data['items'][0]['title'] == 'Bientôt échu'
    assert data['items'][0]['overdue'] is False


def test_expiring_flag_overdue(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Dépassé').get_json()['document_id']
    with admin.client.application.app_context():
        document = db.session.get(Document, doc_id)
        assert document is not None
        document.retention_expires_at = datetime.utcnow() - timedelta(days=2)
        db.session.commit()

    data = admin.get('/api/dashboard/expiring').get_json()

    assert data['items'][0]['overdue'] is True


def test_expiring_exclut_la_retention_lointaine(admin, doc_type_id,
                                                 principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Thèse lointaine',
               retention_period=3650)

    assert admin.get('/api/dashboard/expiring').get_json()['total'] == 0


# ---------------------------------------------------------------------------
# Uploads par mois
# ---------------------------------------------------------------------------

def test_uploads_par_mois(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Ce mois-ci')

    data = admin.get('/api/dashboard/uploads').get_json()

    assert data['months_count'] == 12
    assert len(data['months']) == 12
    assert data['months'][-1]['count'] == 1
    assert data['months'][-1]['month'] == f'{datetime.utcnow():%Y-%m}'
    assert sum(m['count'] for m in data['months']) == 1


def test_uploads_scope_campus(admin, doc_type_id, principal_id,
                              second_campus_id):
    create_doc(admin, doc_type_id, second_campus_id, title='Est')

    data = admin.get(
        f'/api/dashboard/uploads?campus_id={second_campus_id}').get_json()

    assert data['months'][-1]['count'] == 1
    data_principal = admin.get(
        f'/api/dashboard/uploads?campus_id={principal_id}').get_json()
    assert sum(m['count'] for m in data_principal['months']) == 0


# ---------------------------------------------------------------------------
# Activité (audit)
# ---------------------------------------------------------------------------

def test_activity_utilisateur_ne_voit_que_ses_actions(admin, student,
                                                      doc_type_id,
                                                      principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Par admin')
    create_doc(student, doc_type_id, principal_id, title='Par étudiant')

    data = student.get('/api/dashboard/activity').get_json()

    assert data['total'] >= 1
    assert all(entry['user'] and entry['user']['user_id'] == student.user_id
               for entry in data['items'])


def test_activity_admin_voit_le_campus(admin, campus_admin, student,
                                       doc_type_id, principal_id):
    create_doc(student, doc_type_id, principal_id, title='Par étudiant')

    data = campus_admin.get('/api/dashboard/activity').get_json()

    actions = [entry['action'] for entry in data['items']]
    assert 'document_created' in actions


def test_activity_admin_campus_ne_voit_pas_l_autre_campus(app, campus_admin,
                                                          do_login,
                                                          doc_type_id,
                                                          principal_id,
                                                          second_campus_id):
    with app.app_context():
        role = Role.query.filter_by(name='Etudiant').first()
        assert role is not None
        student2 = UserAccount(
            matricule='ETUDEST1', username='etudest',
            email='etudest@uniarchive.edu', full_name='Étudiant Est',
            role_id=role.role_id, campus_id=second_campus_id, is_active=True,
        )
        student2.set_password('Est@2024')
        db.session.add(student2)
        db.session.commit()

    session_est = do_login('etudest', 'Est@2024')
    create_doc(session_est, doc_type_id, second_campus_id, title='Doc Est')

    data = campus_admin.get('/api/dashboard/activity').get_json()

    assert all(entry['user'] is None or entry['user']['user_id']
               != session_est.user_id
               for entry in data['items'])


# ---------------------------------------------------------------------------
# Recent documents
# ---------------------------------------------------------------------------

def test_recent_documents_ordre_et_limite(admin, doc_type_id, principal_id):
    for index in range(3):
        create_doc(admin, doc_type_id, principal_id, title=f'Doc {index}')

    data = admin.get('/api/dashboard/recent-documents?limit=2').get_json()

    assert data['limit'] == 2
    assert len(data['items']) == 2
    assert data['items'][0]['title'] == 'Doc 2'


def test_recent_documents_exclut_les_supprimes(admin, doc_type_id,
                                               principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='À supprimer').get_json()['document_id']
    admin.delete(f'/api/documents/{doc_id}')

    titles = [i['title'] for i in
              admin.get('/api/dashboard/recent-documents').get_json()['items']]

    assert 'À supprimer' not in titles
