"""
Parcours d'authentification : session opaque + 2FA (plan07 — P0.3).

Remplace l'ancien script manuel `tests/test_auth.py`, qui reposait sur des
JWT et un serveur lancé à la main. Les tests s'exécutent contre l'application
de test (SQLite en mémoire, rate limiting désactivé).
"""

from app.models.audit import AuditLog
from app.models.password_reset import PasswordResetToken
from app.models.role import Role
from app.models.two_factor import TwoFactorCode
from app.models.user import UserAccount
from extensions import db

ADMIN_CREDENTIALS = {'username': 'admin', 'password': 'Admin@2024'}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_renvoie_requires_2fa_sans_token(client):
    """Le login ne crée PAS de session : il renvoie simply requires_2fa."""
    resp = client.post('/api/auth/login', json=ADMIN_CREDENTIALS)

    assert resp.status_code == 200
    data = resp.get_json()
    assert data['requires_2fa'] is True
    assert data['user_id'] > 0
    # Jamais de JWT (l'ancien schéma) — la session vient après la 2FA
    assert 'access_token' not in data
    assert 'token' not in data
    # Aucun cookie de session avant vérification du code
    assert client.get_cookie('uniarchive_session') is None


def test_login_champ_manquant(client):
    resp = client.post('/api/auth/login', json={'username': 'admin'})
    assert resp.status_code == 400
    assert isinstance(resp.get_json()['error'], str)


def test_login_mot_de_passe_incorrect(client):
    resp = client.post('/api/auth/login',
                       json={'username': 'admin', 'password': 'Mauvais@123'})

    assert resp.status_code == 401
    assert client.get_cookie('uniarchive_session') is None
    # La tentative échouée est journalisée
    assert AuditLog.query.filter_by(action='login_failed').count() == 1


def test_login_utilisateur_inconnu(client):
    resp = client.post('/api/auth/login',
                       json={'username': 'introuvable', 'password': 'Encore@12'})

    assert resp.status_code == 401
    assert resp.get_json()['error'] == 'Identifiants invalides'


def test_login_compte_desactive(app, client):
    with app.app_context():
        etudiant_role = Role.query.filter_by(name='Etudiant').first()
        assert etudiant_role is not None
        user = UserAccount(
            matricule='INACTIF1',
            username='inactif',
            email='inactif@uniarchive.edu',
            full_name='Compte désactivé',
            role_id=etudiant_role.role_id,
            is_active=False,
        )
        user.set_password('Inactif@2024')
        db.session.add(user)
        db.session.commit()

    resp = client.post('/api/auth/login',
                       json={'username': 'inactif', 'password': 'Inactif@2024'})

    assert resp.status_code == 401
    assert resp.get_json()['error'] == 'Compte désactivé'


# ---------------------------------------------------------------------------
# Vérification 2FA
# ---------------------------------------------------------------------------

def test_verify_2fa_champs_requis(client):
    resp = client.post('/api/auth/verify-2fa', json={'user_id': 1})
    assert resp.status_code == 400


def test_verify_2fa_code_invalide(client):
    client.post('/api/auth/login', json=ADMIN_CREDENTIALS)

    resp = client.post('/api/auth/verify-2fa',
                       json={'user_id': 1, 'code': '000000'})

    assert resp.status_code == 401
    assert client.get_cookie('uniarchive_session') is None


def test_verify_2fa_code_inutilisable_une_deuxieme_fois(client):
    """Un code vérifié est marqué `verified` : il ne peut plus servir."""
    client.post('/api/auth/login', json=ADMIN_CREDENTIALS)
    pending_code = TwoFactorCode.query.filter_by(verified=False).first()
    assert pending_code is not None
    code = pending_code.code

    first = client.post('/api/auth/verify-2fa', json={'user_id': 1, 'code': code})
    second = client.post('/api/auth/verify-2fa', json={'user_id': 1, 'code': code})

    assert first.status_code == 200
    assert second.status_code == 401


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

def test_parcours_complet_et_profil(admin):
    profile = admin.user()

    assert profile['username'] == 'admin'
    assert profile['role']['name'] == 'Admin'
    assert profile['department']['code'] == 'ADMIN'


def test_me_sans_session(client):
    resp = client.get('/api/auth/me')

    assert resp.status_code == 401
    assert resp.get_json()['error'] == 'Authentification requise'


def test_me_avec_cookie_invalide(client):
    client.set_cookie('uniarchive_session', 'id-de-session-inexistant')

    resp = client.get('/api/auth/me')

    assert resp.status_code == 401


def test_logout_revoque_la_session(admin):
    resp = admin.post('/api/auth/logout')

    assert resp.status_code == 200
    assert admin.get('/api/auth/me').status_code == 401


def test_liste_des_sessions(admin):
    resp = admin.get('/api/auth/sessions')

    assert resp.status_code == 200
    sessions = resp.get_json()['sessions']
    assert len(sessions) == 1
    entry = sessions[0]
    # L'identifiant est exposé sous forme de préfixe (tronqué à 8 caractères)
    assert len(entry['session_id']) == 9  # 8 caractères + '…'
    assert entry['session_id'].endswith('…')
    # Le CSRF et l'id brut de session ne doivent jamais fuiter hors du module
    assert 'csrf_token' not in entry
    assert 'user_id' not in entry


def test_revoque_toutes_les_sessions(admin):
    resp = admin.delete('/api/auth/sessions')

    assert resp.status_code == 200
    assert 'session(s) révoquée(s)' in resp.get_json()['message']
    assert admin.get('/api/auth/me').status_code == 401


def test_mutation_sans_csrf_rejetee(admin):
    """Double-submit strict : sans en-tête X-CSRF-Token, la mutation échoue."""
    resp = admin.without_csrf().post('/api/auth/logout')

    assert resp.status_code == 403
    assert 'CSRF' in resp.get_json()['error']


# ---------------------------------------------------------------------------
# Mots de passe
# ---------------------------------------------------------------------------

def test_changement_de_mot_de_passe(admin, do_login):
    resp = admin.post('/api/auth/change-password', json={
        'current_password': 'Admin@2024',
        'new_password': 'Nouveau@2026',
    })

    assert resp.status_code == 200
    # Le nouveau mot de passe est effectif
    assert do_login('admin', 'Nouveau@2026').user()['username'] == 'admin'
    # …et l'ancien ne l'est plus
    old = admin.client.post('/api/auth/login', json={
        'username': 'admin', 'password': 'Admin@2024',
    })
    assert old.status_code == 401


def test_changement_ancien_mot_de_passe_incorrect(admin):
    resp = admin.post('/api/auth/change-password', json={
        'current_password': 'PasLeBon@123',
        'new_password': 'Nouveau@2026',
    })

    assert resp.status_code == 401


def test_changement_mot_de_passe_trop_faible(admin):
    resp = admin.post('/api/auth/change-password', json={
        'current_password': 'Admin@2024',
        'new_password': 'court',
    })

    assert resp.status_code == 400
    assert 'caractères' in resp.get_json()['error']


def test_mot_de_passe_oublie_puis_reinitialisation(app, client, do_login):
    resp = client.post('/api/auth/forgot-password',
                       json={'email': 'admin@uniarchive.edu'})
    assert resp.status_code == 200
    # Message volontairement identique si l'email n'existe pas (anti-énumération)
    assert 'réinitialisation' in resp.get_json()['message']

    with app.app_context():
        reset_row = PasswordResetToken.query.order_by(
            PasswordResetToken.token_id.desc()).first()
        assert reset_row is not None
        token = reset_row.token

    resp = client.post('/api/auth/reset-password', json={
        'token': token, 'new_password': 'Reinitialise@2026',
    })
    assert resp.status_code == 200

    # Connexion avec le nouveau mot de passe
    assert do_login('admin', 'Reinitialise@2026').user()['username'] == 'admin'

    # Le jeton est à usage unique
    replay = client.post('/api/auth/reset-password', json={
        'token': token, 'new_password': 'EncoreUne@2026',
    })
    assert replay.status_code == 400


def test_email_oublie_invalide(client):
    resp = client.post('/api/auth/forgot-password', json={'email': 'pas-un-email'})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Journal d'audit
# ---------------------------------------------------------------------------

def test_audit_trace_le_cycle_de_connexion(admin):
    """Login (2FA) → logout : chaque étape doit laisser une trace d'audit."""
    admin.post('/api/auth/logout')

    actions = [row.action for row in AuditLog.query.all()]
    assert 'login_2fa_required' in actions
    assert 'login_2fa_success' in actions
    assert 'logout' in actions
