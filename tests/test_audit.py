"""
Journal d'audit (plan 07 — P0.8).

Vérifie les deux mécanismes : trace explicite des services + filet de sécurité
`after_request` sur les mutations, sans doublon, avec attribution de l'auteur.
"""

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.role import Role
from app.models.security_alert import SecurityAlert
from app.models.user import UserAccount
from app.services import audit_service


def rows(action):
    return AuditLog.query.filter_by(action=action).all()


# ---------------------------------------------------------------------------
# Filet de sécurité (after_request)
# ---------------------------------------------------------------------------


def test_requetes_get_ne_sont_pas_journalisees(admin):
    avant = AuditLog.query.count()

    resp = admin.get('/api/users')

    assert resp.status_code == 200
    assert AuditLog.query.count() == avant


def test_mutation_non_couverte_par_un_service_quand_meme_trac(client):
    """
    `forgot-password` sur un email inconnu renvoie 200 sans trace explicite
    (anti-énumération) : c'est le filet de sécurité qui journalise ici.
    """
    resp = client.post('/api/auth/forgot-password',
                       json={'email': 'jamais-vu@uniarchive.edu'})

    assert resp.status_code == 200
    entry = AuditLog.query.filter_by(action='forgot_password').one()
    assert entry.object_type == 'authentication'
    assert entry.details == {
        'method': 'POST',
        'path': '/api/auth/forgot-password',
        'status': 200,
    }
    assert entry.user_id is None  # acteur inconnu


def test_aucun_doublon_quand_le_service_deja_trace(client):
    """Le service trace `password_reset_requested` : le filet ne doit rien ajouter."""
    client.post('/api/auth/forgot-password', json={'email': 'admin@uniarchive.edu'})

    assert len(rows('password_reset_requested')) == 1
    assert len(rows('forgot_password')) == 0


def test_mutation_refusee_non_journalisee(student):
    """403 : rien dans le journal générique (les refus sont des traces métier)."""
    resp = student.delete('/api/users/3')

    assert resp.status_code == 403
    assert rows('user_deleted') == []
    assert rows('delete_user') == []


# ---------------------------------------------------------------------------
# Traces explicites des services
# ---------------------------------------------------------------------------


def test_suppression_utilisateur_journalisee_une_fois(admin):
    cible = UserAccount.query.filter_by(username='etudiant').one().user_id

    resp = admin.delete(f'/api/users/{cible}')

    assert resp.status_code == 200
    entries = rows('user_deleted')
    assert len(entries) == 1  # trace métier, PAS doublonnée par le filet
    assert entries[0].user_id == admin.user_id
    assert entries[0].object_type == 'user_account'
    assert entries[0].object_id == cible
    assert entries[0].details['username'] == 'etudiant'
    # Le filet n'a pas ajouté d'entrée concurrente
    assert rows('delete_user') == []


def test_logout_ne_laisse_quune_trace(admin):
    admin.post('/api/auth/logout')

    assert len(rows('logout')) == 1


def test_creation_utilisateur_attribue_ladmin(admin):
    role_id = Role.query.filter_by(name='Prof').one().role_id

    resp = admin.post('/api/users', json={
        'matricule': 'PROF099',
        'username': 'prof.test',
        'email': 'prof.test@uniarchive.edu',
        'full_name': 'Prof Test',
        'role_id': role_id,
        'campus_id': Campus.query.filter_by(code='PRINCIPAL').one().campus_id,
        'password': 'ProfTest@2026',
    })

    assert resp.status_code == 201, resp.get_json()
    entry = rows('user_created').pop()
    assert entry.user_id == admin.user_id
    assert entry.details['username'] == 'prof.test'


# ---------------------------------------------------------------------------
# Détection de tentatives multiples
# ---------------------------------------------------------------------------


def test_alerte_securite_apres_5_connexions_echouees(client):
    """
    `login_failed` porte désormais l'`user_id` : sans lui, la requête de comptage
    (`AuditLog.user_id == user_id`) ne trouvait rien et l'alerte n'était jamais
    créée — bug corrigé dans le cadre de P0.8.
    """
    for _ in range(5):
        resp = client.post('/api/auth/login',
                           json={'username': 'admin', 'password': 'Mauvais@123'})
        assert resp.status_code == 401

    admin_id = UserAccount.query.filter_by(username='admin').one().user_id
    failed = rows('login_failed')
    assert len(failed) == 5
    assert all(entry.user_id == admin_id for entry in failed)
    assert all(entry.details['reason'] == 'invalid_password' for entry in failed)

    alert = SecurityAlert.query.filter_by(
        alert_type='multiple_login_attempts').one()
    assert alert.severity == 'high'
    assert alert.details['attempts'] == 5


def test_tentative_sur_compte_inconnu_sans_attribut(client):
    """Un utilisateur inexistant n'a pas d'auteur attribuable (anti-énumération)."""
    client.post('/api/auth/login',
                json={'username': 'fantome', 'password': 'Encore@123'})

    failed = rows('login_failed')
    assert len(failed) == 1
    assert failed[0].user_id is None
    assert failed[0].details['reason'] == 'user_not_found'


# ---------------------------------------------------------------------------
# API du service
# ---------------------------------------------------------------------------


def test_log_reprend_lutilisateur_du_contexte(app):
    """L'auteur est repris de `g.current_user` posé par `@session_required`."""
    from flask import g

    admin_user = UserAccount.query.filter_by(username='admin').one()
    with app.test_request_context('/api/users'):
        g.current_user = admin_user
        entry = audit_service.log('action_unitaire', 'api')

    assert entry.user_id == admin_user.user_id
    # La trace a été marquée comme faite : le filet n'ajoutera rien d'autre
    assert len(rows('action_unitaire')) == 1


def test_log_hors_contexte_de_requete(app):
    entry = audit_service.log('action_sans_requete', 'api', details={'a': 1})

    assert entry.user_id is None
    assert entry.details == {'a': 1}
    assert len(rows('action_sans_requete')) == 1
