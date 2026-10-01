"""Recherche de documents (plan 07 — P4, §4.5).

Les tests tournent sur SQLite → moteur `sql_ilike` ; le chemin PostgreSQL
(tsvector + pg_trgm + ts_headline) est exercé par la CI Docker.
"""

import io

import pytest

from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.role import Role
from app.models.tag import Tag
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
        campus = Campus(code='NORD', name='Campus Nord')
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
def thesis_type_id(app):
    with app.app_context():
        doc_type = DocType.query.filter_by(name='Thèse').first()
        assert doc_type is not None
        return doc_type.doc_type_id


@pytest.fixture
def info_department_id(app):
    with app.app_context():
        department = Department.query.filter_by(code='INFO').first()
        assert department is not None
        return department.department_id


@pytest.fixture
def maths_department_id(app):
    with app.app_context():
        department = Department.query.filter_by(code='MATH').first()
        assert department is not None
        return department.department_id


@pytest.fixture
def campus_admin(app, client, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert role is not None and campus is not None
        user = UserAccount(
            matricule='ADMINC4', username='adminc4', email='adminc4@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc4', 'AdminC@2024')


def create_doc(session, doc_type_id, campus_id, department_id=None, file=None,
               **fields):
    data = {'title': fields.pop('title', 'Rapport de test'),
            'doc_type_id': str(doc_type_id),
            'campus_id': str(campus_id)}
    if department_id is not None:
        data['department_id'] = str(department_id)
    for key, value in fields.items():
        data[key] = value if isinstance(value, str) else str(value)
    if file is not None:
        data['file'] = (io.BytesIO(file[0]), file[1])
    return session.post('/api/documents', data=data,
                        content_type='multipart/form-data')


# ---------------------------------------------------------------------------
# Accès et périmètre
# ---------------------------------------------------------------------------

def test_recherche_exige_une_session(client):
    assert client.get('/api/search?q=test').status_code == 401


def test_recherche_sans_requete_liste_le_campus(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Un')
    create_doc(admin, doc_type_id, principal_id, title='Deux')

    body = admin.get('/api/search').get_json()

    assert body['total'] == 2
    assert body['engine'] == 'sql_ilike'
    assert body['took_ms'] >= 0
    assert [item['title'] for item in body['items']] == ['Deux', 'Un']


def test_recherche_par_titre_avec_extrait(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id,
               title="Rapport d'expertise comptable", description='Analyse détaillée')
    create_doc(admin, doc_type_id, principal_id, title='Mémoire de licence')

    body = admin.get('/api/search?q=expertise')

    data = body.get_json()
    assert data['total'] == 1
    assert data['items'][0]['title'] == "Rapport d'expertise comptable"
    assert '<mark>' in data['items'][0]['snippet']


def test_recherche_dans_la_description(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Dossier A',
               description='Waterquality du lac')
    create_doc(admin, doc_type_id, principal_id, title='Dossier B')

    data = admin.get('/api/search?q=waterquality').get_json()

    assert data['total'] == 1
    assert data['items'][0]['title'] == 'Dossier A'


def test_recherche_ignore_la_casse(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Rapport Hydrologie')

    assert admin.get('/api/search?q=hydrologie').get_json()['total'] == 1


def test_perimetre_campus_de_la_recherche(admin, campus_admin, doc_type_id,
                                          principal_id, second_campus_id):
    create_doc(admin, doc_type_id, second_campus_id, title='Document Nord')
    create_doc(admin, doc_type_id, principal_id, title='Document Principal')

    titles = [i['title'] for i in
              campus_admin.get('/api/search').get_json()['items']]
    assert titles == ['Document Principal']

    nord = admin.get(f'/api/search?campus_id={second_campus_id}').get_json()
    assert [i['title'] for i in nord['items']] == ['Document Nord']


def test_admin_campus_filtre_un_autre_campus_refuse(campus_admin,
                                                    second_campus_id):
    resp = campus_admin.get(f'/api/search?campus_id={second_campus_id}')

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Filtres et facettes
# ---------------------------------------------------------------------------

def test_recherche_filtre_par_type_et_departement(admin, doc_type_id,
                                                  thesis_type_id,
                                                  principal_id,
                                                  info_department_id,
                                                  maths_department_id):
    create_doc(admin, doc_type_id, principal_id, title='Rapport A',
               department_id=info_department_id)
    create_doc(admin, thesis_type_id, principal_id, title='Thèse B',
               department_id=maths_department_id)

    by_type = admin.get(
        f'/api/search?doc_type_id={doc_type_id}').get_json()
    assert [i['title'] for i in by_type['items']] == ['Rapport A']

    by_dept = admin.get(
        f'/api/search?department_id={maths_department_id}').get_json()
    assert [i['title'] for i in by_dept['items']] == ['Thèse B']


def test_recherche_filtre_par_tag(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='Document taggé').get_json()['document_id']
    create_doc(admin, doc_type_id, principal_id, title='Sans tag')
    admin.post(f'/api/documents/{doc_id}/tags', json={'tags': ['hydrologie']})

    with admin.client.application.app_context():
        tag = Tag.query.filter_by(name='hydrologie').first()
        assert tag is not None
        tag_id = tag.tag_id

    data = admin.get(f'/api/search?tag_ids={tag_id}').get_json()

    assert data['total'] == 1
    assert data['items'][0]['title'] == 'Document taggé'


def test_facettes_cohérentes_avec_le_résultat(admin, doc_type_id,
                                              thesis_type_id, principal_id,
                                              info_department_id):
    create_doc(admin, doc_type_id, principal_id, title='Rapport un',
               department_id=info_department_id)
    create_doc(admin, doc_type_id, principal_id, title='Rapport deux',
               department_id=info_department_id)
    create_doc(admin, thesis_type_id, principal_id, title='Thèse trois',
               department_id=info_department_id)

    data = admin.get('/api/search').get_json()

    doc_types = {f['label']: f['count'] for f in data['facets']['doc_types']}
    assert doc_types == {'Rapport': 2, 'Thèse': 1}

    statuses = {f['value']: f['count'] for f in data['facets']['statuses']}
    assert statuses == {'active': 3}

    departments = {f['label']: f['count']
                   for f in data['facets']['departments']}
    assert departments == {'Informatique': 3}


def test_facettes_reduites_par_le_filtre(admin, doc_type_id, thesis_type_id,
                                         principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Rapport un')
    create_doc(admin, thesis_type_id, principal_id, title='Thèse deux')

    data = admin.get(f'/api/search?doc_type_id={doc_type_id}').get_json()

    assert data['total'] == 1
    doc_types = {f['label']: f['count'] for f in data['facets']['doc_types']}
    assert doc_types == {'Rapport': 1}


def test_recherche_exclut_les_supprimes_par_defaut(admin, doc_type_id,
                                                   principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        title='À supprimer').get_json()['document_id']
    admin.delete(f'/api/documents/{doc_id}')

    assert admin.get('/api/search?q=supprimer').get_json()['total'] == 0

    deleted = admin.get('/api/search?q=supprimer&status=deleted').get_json()
    assert deleted['total'] == 1


def test_pagination_de_la_recherche(admin, doc_type_id, principal_id):
    for index in range(3):
        create_doc(admin, doc_type_id, principal_id, title=f'Doc {index}')

    data = admin.get('/api/search?per_page=2&page=2').get_json()

    assert data['total'] == 3
    assert data['pages'] == 2
    assert len(data['items']) == 1


# ---------------------------------------------------------------------------
# Historique
# ---------------------------------------------------------------------------

def test_historique_enregistre_les_recherches(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Rapport hydro')

    admin.get('/api/search?q=hydro')
    admin.get('/api/search?q=hydro')
    admin.get('/api/search?q=autre')

    data = admin.get('/api/search/history').get_json()

    assert data['total'] == 2
    assert data['items'][0]['query'] == 'autre'
    assert data['items'][1]['query'] == 'hydro'
    assert data['items'][1]['results_count'] == 1


def test_historique_propre_a_chaque_utilisateur(admin, student, doc_type_id,
                                                principal_id):
    admin.get('/api/search?q=reserve-admin')

    data = student.get('/api/search/history').get_json()

    assert data['total'] == 0


def test_vidage_de_l_historique(admin, doc_type_id, principal_id):
    admin.get('/api/search?q=hydro')
    admin.get('/api/search?q=licence')

    resp = admin.delete('/api/search/history')

    assert resp.status_code == 200
    assert resp.get_json()['deleted'] == 2
    assert admin.get('/api/search/history').get_json()['total'] == 0


def test_historique_ne_trace_pas_les_recherches_vides(admin):
    admin.get('/api/search')

    assert admin.get('/api/search/history').get_json()['total'] == 0


def test_recherche_par_un_compte_sans_campus_refusee(app, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Etudiant').first()
        assert role is not None
        user = UserAccount(
            matricule='NOCAMP1', username='nocampus',
            email='nocampus@uniarchive.edu', full_name='Sans campus',
            role_id=role.role_id, campus_id=None, is_active=True,
        )
        user.set_password('NoCampus@2024')
        db.session.add(user)
        db.session.commit()

    session = do_login('nocampus', 'NoCampus@2024')
    resp = session.get('/api/search')

    assert resp.status_code == 403
    assert resp.get_json()['code'] == 'no_campus_scope'
