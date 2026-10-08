import pytest

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.department import Department
from app.models.institution import Institution
from app.models.role import Role
from app.models.setting import Setting
from app.models.user import UserAccount
from extensions import db


@pytest.fixture
def principal_id(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert campus is not None
        return campus.campus_id


@pytest.fixture
def second_campus(app):
    with app.app_context():
        campus = Campus(code='ANNEXE', name='Campus annexe', is_active=True)
        db.session.add(campus)
        db.session.commit()
        return campus.campus_id


@pytest.fixture
def campus_admin(app, client, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert role is not None and campus is not None
        user = UserAccount(
            matricule='ADMINC1', username='adminc', email='adminc@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc', 'AdminC@2024')


def test_institution_publique_sans_authentification(client):
    resp = client.get('/api/institution')

    assert resp.status_code == 200
    assert resp.get_json()['name']
    assert resp.get_json()['locale'] == 'fr'


def test_institution_mise_a_jour_par_admin(admin):
    resp = admin.put('/api/institution', json={'name': 'Université Test',
                                               'slogan': 'Savoir & Progrès'})

    assert resp.status_code == 200
    assert resp.get_json()['name'] == 'Université Test'
    with admin.client.application.app_context():
        institution = Institution.get()
        assert institution is not None
        assert institution.slogan == 'Savoir & Progrès'


def test_institution_mise_a_jour_refusee_sans_session(client):
    resp = client.put('/api/institution', json={'name': 'X'})
    assert resp.status_code == 401


def test_liste_campus_super_admin(admin):
    resp = admin.get('/api/campuses')

    assert resp.status_code == 200
    codes = [c['code'] for c in resp.get_json()['campuses']]
    assert codes == ['PRINCIPAL']
    assert 'stats' in resp.get_json()['campuses'][0]


def test_liste_campus_exige_authentification(client):
    assert client.get('/api/campuses').status_code == 401


def test_admin_de_campus_ne_voit_que_son_campus(campus_admin, second_campus):
    resp = campus_admin.get('/api/campuses')

    assert resp.status_code == 200
    assert [c['code'] for c in resp.get_json()['campuses']] == ['PRINCIPAL']


def test_detail_campus_avec_statistiques(admin, principal_id):
    resp = admin.get(f'/api/campuses/{principal_id}')

    assert resp.status_code == 200
    data = resp.get_json()
    assert data['code'] == 'PRINCIPAL'
    assert data['stats']['departments'] == 4


def test_acces_detail_campus_autre_campus_refuse(campus_admin, second_campus):
    resp = campus_admin.get(f'/api/campuses/{second_campus}')
    assert resp.status_code == 403


def test_creation_campus_par_super_admin(admin):
    resp = admin.post('/api/campuses', json={'code': 'dla-c2', 'name': 'Antenne Douala',
                                             'city': 'Douala'})

    assert resp.status_code == 201
    assert resp.get_json()['code'] == 'DLA-C2'


def test_creation_campus_code_duplique_conflit(admin):
    admin.post('/api/campuses', json={'code': 'SUD', 'name': 'Campus Sud'})
    resp = admin.post('/api/campuses', json={'code': 'sud', 'name': 'Doublon'})

    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'campus_code_exists'


def test_creation_campus_nom_manquant(admin):
    resp = admin.post('/api/campuses', json={'code': 'SANS-NOM'})

    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'missing_campus_name'


def test_creation_campus_refusee_a_un_admin_de_campus(campus_admin):
    resp = campus_admin.post('/api/campuses', json={'code': 'NOPE', 'name': 'Non'})
    assert resp.status_code == 403


def test_mise_a_jour_campus(admin, second_campus):
    resp = admin.put(f'/api/campuses/{second_campus}', json={'name': 'Annexe renommée'})

    assert resp.status_code == 200
    assert resp.get_json()['name'] == 'Annexe renommée'


def test_desactivation_campus_vide(admin, second_campus):
    resp = admin.patch(f'/api/campuses/{second_campus}/status', json={'is_active': False})

    assert resp.status_code == 200
    assert resp.get_json()['is_active'] is False


def test_desactivation_campus_non_vide_refusee(admin, principal_id):
    resp = admin.patch(f'/api/campuses/{principal_id}/status', json={'is_active': False})

    assert resp.status_code == 409
    body = resp.get_json()
    assert body['code'] == 'campus_not_empty'
    assert body['details']['departments'] == 4


def test_desactivation_refusee_a_un_admin_de_campus(campus_admin, principal_id):
    resp = campus_admin.patch(f'/api/campuses/{principal_id}/status',
                              json={'is_active': False})
    assert resp.status_code == 403


def test_suppression_physique_interdite(admin, second_campus):
    resp = admin.delete(f'/api/campuses/{second_campus}')

    assert resp.status_code == 409
    assert resp.get_json()['code'] == 'campus_deletion_forbidden'
    with admin.client.application.app_context():
        assert Campus.query.get(second_campus) is not None


def test_me_expose_le_super_admin(admin):
    profile = admin.user()
    assert profile['is_super_admin'] is True
    assert profile['campus_id'] is None


def test_me_expose_le_campus_de_l_utilisateur(student, principal_id):
    profile = student.user()
    assert profile['is_super_admin'] is False
    assert profile['campus_id'] == principal_id


def test_schema_des_reglages(admin):
    resp = admin.get('/api/settings/schema')

    assert resp.status_code == 200
    body = resp.get_json()
    keys = {item['key'] for item in body['settings']}
    assert 'general.locale' in keys
    assert 'archives.retention_warning_days' in keys
    assert any(cat['name'] == 'archives' for cat in body['categories'])


def test_valeurs_effectives_par_defaut(admin):
    resp = admin.get('/api/settings')

    assert resp.status_code == 200
    assert resp.get_json()['settings']['general.locale'] == 'fr'
    assert resp.get_json()['settings']['storage.max_upload_mb'] == 50


def test_reglages_publics_sans_session(client):
    resp = client.get('/api/settings/public')

    assert resp.status_code == 200
    settings = resp.get_json()['settings']
    assert settings['general.locale'] == 'fr'
    assert 'auth.password_min_length' in settings
    assert 'archives.reference_template' not in settings


def test_reglages_usine(admin):
    resp = admin.get('/api/settings/defaults')

    assert resp.status_code == 200
    assert resp.get_json()['settings']['archives.retention_enabled'] is True


def test_ecriture_globale_par_super_admin(admin):
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'general.locale', 'value': 'en', 'scope': 'global'},
    ]})

    assert resp.status_code == 200
    assert admin.get('/api/settings').get_json()['settings']['general.locale'] == 'en'


def test_ecriture_globale_refusee_a_admin_de_campus(campus_admin):
    resp = campus_admin.put('/api/settings', json={'settings': [
        {'key': 'general.locale', 'value': 'en', 'scope': 'global'},
    ]})

    assert resp.status_code == 403
    assert resp.get_json()['code'] == 'super_admin_required'


def test_hierarchie_defaut_global_campus(admin, principal_id):
    admin.put('/api/settings', json={'settings': [
        {'key': 'storage.max_upload_mb', 'value': 100, 'scope': 'global'},
    ]})
    admin.put('/api/settings', json={'settings': [
        {'key': 'storage.max_upload_mb', 'value': 25, 'scope': 'campus',
         'campus_id': principal_id},
    ]})

    assert admin.get('/api/settings').get_json()['settings']['storage.max_upload_mb'] == 100
    scoped = admin.get(f'/api/settings?campus_id={principal_id}')
    assert scoped.get_json()['settings']['storage.max_upload_mb'] == 25


def test_surcharge_campus_reservee_a_son_admin(admin, campus_admin, second_campus):
    resp = campus_admin.put('/api/settings', json={'settings': [
        {'key': 'notifications.retention_warning', 'value': False,
         'scope': 'campus', 'campus_id': second_campus},
    ]})

    assert resp.status_code == 403
    assert resp.get_json()['code'] == 'cross_campus_access'


def test_valeur_de_type_invalide_refusee(admin):
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'archives.retention_enabled', 'value': 'oui'},
    ]})

    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'invalid_setting'


def test_valeur_hors_choix_refusee(admin):
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'general.locale', 'value': 'de'},
    ]})

    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'invalid_setting'


def test_bornes_numeriques_respectees(admin):
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'auth.password_min_length', 'value': 2},
    ]})

    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'invalid_setting'


def test_reglage_inconnu(admin):
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'inexistant.cle', 'value': 1},
    ]})

    assert resp.status_code == 404
    assert resp.get_json()['code'] == 'unknown_setting'


def test_csrf_requis_pour_ecrire_un_reglage(admin):
    admin.without_csrf()
    resp = admin.put('/api/settings', json={'settings': [
        {'key': 'general.locale', 'value': 'en'},
    ]})

    assert resp.status_code == 403


def test_ecriture_reglage_journalisee(admin):
    admin.put('/api/settings', json={'settings': [
        {'key': 'features.ocr_enabled', 'value': True},
    ]})

    with admin.client.application.app_context():
        entry = AuditLog.query.filter_by(action='settings_updated').first()
        assert entry is not None
        assert 'features.ocr_enabled' in entry.details['keys']


def test_persistance_du_reglage(admin):
    admin.put('/api/settings', json={'settings': [
        {'key': 'archives.reference_template', 'value': '{CAMPUS}/{SEQ}'},
    ]})

    with admin.client.application.app_context():
        row = Setting.query.filter_by(key='archives.reference_template',
                                      scope='global').first()
        assert row is not None
        assert row.value == '{CAMPUS}/{SEQ}'


def test_seed_departements_rattaches_au_campus(app, principal_id):
    with app.app_context():
        assert Department.query.filter_by(campus_id=None).count() == 0
        assert Department.query.filter_by(campus_id=principal_id).count() == 4
