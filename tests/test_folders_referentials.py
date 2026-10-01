import pytest

from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.folder import Folder
from app.models.role import Role
from app.models.tag import Tag
from app.models.user import UserAccount
from extensions import db


@pytest.fixture
def principal_id(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert campus is not None
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
            matricule='ADMINC3', username='adminc3', email='adminc3@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc3', 'AdminC@2024')


def test_creation_et_liste_dossier(admin, principal_id):
    resp = admin.post('/api/folders', json={'name': 'Promo 2026',
                                            'campus_id': principal_id})

    assert resp.status_code == 201
    folder_id = resp.get_json()['folder_id']
    listed = admin.get('/api/folders').get_json()['folders']
    assert folder_id in [f['folder_id'] for f in listed]


def test_arborescence_tree(admin, principal_id):
    parent = admin.post('/api/folders', json={'name': 'P', 'campus_id': principal_id})
    parent_id = parent.get_json()['folder_id']
    admin.post('/api/folders', json={'name': 'E', 'parent_folder_id': parent_id})

    tree = admin.get('/api/folders?view=tree').get_json()['folders']
    node = next(n for n in tree if n['folder_id'] == parent_id)
    assert [c['name'] for c in node['subfolders']] == ['E']


def test_chemin_de_dossier(admin, principal_id):
    parent_id = admin.post('/api/folders', json={'name': 'A',
                                                 'campus_id': principal_id}).get_json()['folder_id']
    child_id = admin.post('/api/folders', json={'name': 'B',
                                                'parent_folder_id': parent_id}).get_json()['folder_id']

    path = admin.get(f'/api/folders/{child_id}/path').get_json()['path']
    assert [p['name'] for p in path] == ['A', 'B']


def test_deplacement_cyclique_refuse(admin, principal_id):
    parent_id = admin.post('/api/folders', json={'name': 'A',
                                                 'campus_id': principal_id}).get_json()['folder_id']
    child_id = admin.post('/api/folders', json={'name': 'B',
                                                'parent_folder_id': parent_id}).get_json()['folder_id']

    resp = admin.post(f'/api/folders/{parent_id}/move',
                      json={'parent_folder_id': child_id})
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'folder_cycle'


def test_suppression_dossier_non_vide_refusee(admin, principal_id):
    parent_id = admin.post('/api/folders', json={'name': 'A',
                                                 'campus_id': principal_id}).get_json()['folder_id']
    admin.post('/api/folders', json={'name': 'B', 'parent_folder_id': parent_id})

    resp = admin.delete(f'/api/folders/{parent_id}')
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'folder_not_empty'


def test_suppression_dossier_vide(admin, principal_id):
    folder_id = admin.post('/api/folders', json={'name': 'Vide',
                                                 'campus_id': principal_id}).get_json()['folder_id']
    assert admin.delete(f'/api/folders/{folder_id}').status_code == 200


def test_dossiers_globaux_visibles_par_tous(student):
    names = [f['name'] for f in student.get('/api/folders').get_json()['folders']]
    assert 'Archives Académiques' in names


def test_liste_departements_par_admin(admin):
    resp = admin.get('/api/departments')

    assert resp.status_code == 200
    assert len(resp.get_json()['departments']) == 4


def test_creation_departement(admin, principal_id):
    resp = admin.post('/api/departments', json={'name': 'Droit', 'code': 'droit',
                                                'campus_id': principal_id})

    assert resp.status_code == 201
    assert resp.get_json()['code'] == 'DROIT'


def test_code_departement_duplique_par_campus(admin, principal_id):
    admin.post('/api/departments', json={'name': 'Droit', 'code': 'DROIT',
                                         'campus_id': principal_id})
    resp = admin.post('/api/departments', json={'name': 'Autre', 'code': 'droit',
                                                'campus_id': principal_id})

    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'department_code_exists'


def test_suppression_departement_non_vide(admin):
    with admin.client.application.app_context():
        admin_department = Department.query.filter_by(code='ADMIN').first()
        assert admin_department is not None
        department_id = admin_department.department_id

    resp = admin.delete(f'/api/departments/{department_id}')
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'department_not_empty'


def test_admin_de_campus_ne_voit_que_son_campus(campus_admin):
    departments = campus_admin.get('/api/departments').get_json()['departments']
    with campus_admin.client.application.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert campus is not None
        campus_id = campus.campus_id
    assert all(d['campus_id'] == campus_id for d in departments)


def test_crud_type_document(admin):
    created = admin.post('/api/doc-types', json={'name': 'Facture',
                                                 'default_retention_days': 365})
    assert created.status_code == 201
    type_id = created.get_json()['doc_type_id']

    assert admin.patch(f'/api/doc-types/{type_id}',
                       json={'name': 'Factures'}).status_code == 200
    assert admin.delete(f'/api/doc-types/{type_id}').status_code == 200


def test_suppression_type_utilise_refusee(admin, doc_type_id, principal_id):
    admin.post('/api/documents', json={'title': 'Doc', 'doc_type_id': doc_type_id,
                                       'campus_id': principal_id})
    resp = admin.delete(f'/api/doc-types/{doc_type_id}')
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'doc_type_in_use'


def test_crud_tag(admin):
    created = admin.post('/api/tags', json={'name': 'urgent'})
    assert created.status_code == 201
    tag_id = created.get_json()['tag_id']

    assert any(t['name'] == 'urgent' for t in admin.get('/api/tags').get_json()['tags'])
    assert admin.delete(f'/api/tags/{tag_id}').status_code == 200


def test_tag_duplique(admin):
    admin.post('/api/tags', json={'name': 'urgent'})
    resp = admin.post('/api/tags', json={'name': 'URGENT'})
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'tag_exists'


def test_creation_role(admin):
    resp = admin.post('/api/roles', json={'name': 'Archiviste',
                                          'description': 'Gère les archives'})

    assert resp.status_code == 201
    role_id = resp.get_json()['role_id']
    assert admin.delete(f'/api/roles/{role_id}').status_code == 200


def test_suppression_role_utilise_refusee(admin):
    with admin.client.application.app_context():
        role = Role.query.filter_by(name='Admin').first()
        assert role is not None
        role_id = role.role_id

    resp = admin.delete(f'/api/roles/{role_id}')
    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'role_in_use'


def test_ecriture_referentiel_reservee_admin(student):
    assert student.post('/api/tags', json={'name': 'x'}).status_code == 403
    assert student.post('/api/doc-types', json={'name': 'x'}).status_code == 403
