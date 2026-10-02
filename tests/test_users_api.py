"""Rattachement campus des comptes utilisateurs (plan 07 — Q2).

Règle Q2 : `campus_id` est **obligatoire** pour tout rôle non-Admin — fourni
explicitement ou hérité du créateur — ; seul un compte Admin peut en rester
privé (super admin, accès global). Un campus hors du périmètre du créateur est
refusé en 403 `cross_campus_access`, comme sur les autres domaines.

Le défaut corrigé ici : `campus_id` était accepté mais **ignoré**, d'où des
comptes sans campus et 403 `no_campus_scope` sur la recherche, le tableau de
bord et la liste documents.
"""

import pytest

from app.models.campus import Campus
from app.models.role import Role
from app.models.user import UserAccount
from extensions import db


@pytest.fixture
def principal_id(app):
    return Campus.query.filter_by(code='PRINCIPAL').one().campus_id


@pytest.fixture
def second_campus_id(app):
    campus = Campus(code='NORDC9', name='Campus Nord C9')
    db.session.add(campus)
    db.session.commit()
    return campus.campus_id


@pytest.fixture
def campus_admin(app, do_login):
    role = Role.query.filter_by(name='Admin').one()
    campus = Campus.query.filter_by(code='PRINCIPAL').one()
    user = UserAccount(
        matricule='ADMU9', username='admin.campus',
        email='admin.campus@uniarchive.edu', full_name='Admin de campus',
        role_id=role.role_id, campus_id=campus.campus_id, is_active=True)
    user.set_password('AdminU@2024')
    db.session.add(user)
    db.session.commit()
    return do_login('admin.campus', 'AdminU@2024')


def payload(index=0, role='Prof', **overrides):
    data = {
        'matricule': f'UAPI{index:03d}',
        'username': f'user.api.{index}',
        'email': f'user.api.{index}@uniarchive.edu',
        'full_name': 'Utilisateur API',
        'role_id': Role.query.filter_by(name=role).one().role_id,
        'password': 'UserApi@2026',
    }
    data.update(overrides)
    return data


# ---------------------------------------------------------------------------
# Création
# ---------------------------------------------------------------------------

def test_creation_avec_campus_explicite_est_respecte(admin, second_campus_id):
    resp = admin.post('/api/users', json=payload(campus_id=second_campus_id))

    assert resp.status_code == 201, resp.get_json()
    assert resp.get_json()['campus_id'] == second_campus_id


def test_creation_sans_campus_herite_du_createur(campus_admin, principal_id):
    resp = campus_admin.post('/api/users', json=payload())

    assert resp.status_code == 201, resp.get_json()
    assert resp.get_json()['campus_id'] == principal_id


def test_creation_sans_campus_refusee_pour_un_role_non_admin(admin):
    resp = admin.post('/api/users', json=payload())

    assert resp.status_code == 400, resp.get_json()
    assert 'campus_id' in resp.get_json()['error']


def test_creation_d_un_admin_global_sans_campus(admin):
    resp = admin.post('/api/users', json=payload(index=1, role='Admin'))

    assert resp.status_code == 201, resp.get_json()
    assert resp.get_json()['campus_id'] is None


def test_creation_avec_campus_inconnu_rejete(admin):
    resp = admin.post('/api/users', json=payload(campus_id=424242))

    assert resp.status_code == 400, resp.get_json()
    assert 'Campus invalide' in resp.get_json()['error']


def test_creation_intercampus_refusee(campus_admin, second_campus_id):
    resp = campus_admin.post(
        '/api/users', json=payload(campus_id=second_campus_id))

    assert resp.status_code == 403, resp.get_json()
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_compte_cree_dans_son_campus_est_utilisable(admin, do_login,
                                                    principal_id):
    created = admin.post('/api/users',
                         json=payload(index=2, campus_id=principal_id))
    assert created.status_code == 201, created.get_json()

    session = do_login('user.api.2', 'UserApi@2026')
    resp = session.get('/api/search', query_string={'q': 'rapport'})

    assert resp.status_code == 200, resp.get_json()


# ---------------------------------------------------------------------------
# Mise à jour
# ---------------------------------------------------------------------------

def test_maj_de_campus_par_super_admin(admin, principal_id, second_campus_id):
    created = admin.post('/api/users', json=payload(campus_id=principal_id))
    assert created.status_code == 201, created.get_json()

    resp = admin.put(f"/api/users/{created.get_json()['user_id']}",
                     json={'campus_id': second_campus_id})

    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()['campus_id'] == second_campus_id


def test_maj_de_campus_intercampus_refusee(campus_admin, principal_id,
                                           second_campus_id):
    created = campus_admin.post('/api/users', json=payload(campus_id=principal_id))
    assert created.status_code == 201, created.get_json()

    resp = campus_admin.put(f"/api/users/{created.get_json()['user_id']}",
                            json={'campus_id': second_campus_id})

    assert resp.status_code == 403, resp.get_json()
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_maj_sans_campus_le_conserve(admin, principal_id):
    created = admin.post('/api/users', json=payload(campus_id=principal_id))
    user_id = created.get_json()['user_id']

    resp = admin.put(f'/api/users/{user_id}', json={'full_name': 'Renommé'})

    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()['campus_id'] == principal_id


def test_detachement_refuse_pour_un_role_non_admin(admin, principal_id):
    created = admin.post('/api/users', json=payload(campus_id=principal_id))
    user_id = created.get_json()['user_id']

    resp = admin.put(f'/api/users/{user_id}', json={'campus_id': None})

    assert resp.status_code == 400, resp.get_json()
    account = UserAccount.query.get(user_id)
    assert account is not None
    assert account.campus_id == principal_id


def test_passage_en_role_non_admin_exige_un_campus(admin):
    prof_id = Role.query.filter_by(name='Prof').one().role_id
    created = admin.post('/api/users', json=payload(index=3, role='Admin'))
    assert created.status_code == 201, created.get_json()
    assert created.get_json()['campus_id'] is None
    user_id = created.get_json()['user_id']

    resp = admin.put(f'/api/users/{user_id}', json={'role_id': prof_id})

    assert resp.status_code == 400, resp.get_json()
    account = UserAccount.query.get(user_id)
    assert account is not None
    assert account.role_id != prof_id


# ---------------------------------------------------------------------------
# Liste, détail et export : lecture réservée aux admins, dans leur périmètre
# ---------------------------------------------------------------------------

def _prof(username, campus_id):
    role = Role.query.filter_by(name='Prof').one()
    user = UserAccount(
        matricule=username.upper()[:16], username=username,
        email=f'{username}@uniarchive.edu', full_name='Prof Test',
        role_id=role.role_id, campus_id=campus_id, is_active=True)
    user.set_password('ProfMdp@2026')
    db.session.add(user)
    db.session.commit()
    return user.user_id


def _usernames(body):
    return [entry['username'] for entry in body['users']]


def test_liste_des_comptes_exige_admin(client, student, admin):
    assert client.get('/api/users').status_code == 401
    assert student.get('/api/users').status_code == 403
    assert admin.get('/api/users').status_code == 200


def test_detail_d_un_compte_exige_admin(client, student, admin):
    user_id = student.user()['user_id']

    assert client.get(f'/api/users/{user_id}').status_code == 401
    assert student.get(f'/api/users/{user_id}').status_code == 403
    assert admin.get(f'/api/users/{user_id}').status_code == 200


def test_liste_limitee_au_campus_de_l_admin(campus_admin, principal_id,
                                            second_campus_id):
    _prof('prof.principal', principal_id)
    _prof('prof.autre', second_campus_id)

    resp = campus_admin.get('/api/users')

    assert resp.status_code == 200, resp.get_json()
    usernames = _usernames(resp.get_json())
    assert 'prof.principal' in usernames
    assert 'prof.autre' not in usernames


def test_super_admin_liste_tous_les_campuses(admin, principal_id,
                                             second_campus_id):
    _prof('prof.principal', principal_id)
    _prof('prof.autre', second_campus_id)

    resp = admin.get('/api/users')

    assert resp.status_code == 200, resp.get_json()
    usernames = _usernames(resp.get_json())
    assert 'prof.principal' in usernames
    assert 'prof.autre' in usernames


def test_detail_intercampus_refuse(campus_admin, second_campus_id):
    user_id = _prof('prof.autre', second_campus_id)

    resp = campus_admin.get(f'/api/users/{user_id}')

    assert resp.status_code == 403, resp.get_json()
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_detail_d_un_compte_global_refuse_au_campus(campus_admin):
    global_id = UserAccount.query.filter_by(username='admin').one().user_id

    resp = campus_admin.get(f'/api/users/{global_id}')

    assert resp.status_code == 403, resp.get_json()
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_export_respecte_le_campus(campus_admin, principal_id,
                                   second_campus_id):
    _prof('prof.principal', principal_id)
    _prof('prof.autre', second_campus_id)

    resp = campus_admin.get('/api/users/export')

    assert resp.status_code == 200, resp.get_json()
    body = resp.get_data(as_text=True)
    assert 'prof.principal' in body
    assert 'prof.autre' not in body
