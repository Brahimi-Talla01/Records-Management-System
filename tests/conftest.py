"""
Harness de test (plan 07 — P0.2 / P0.3).

    cd backend && pytest                 # toute la suite
    pytest tests/test_auth.py -v         # un fichier
    pytest -k logout                     # un test

Principe :
- une application « testing » par session : SQLite en mémoire (StaticPool),
  sessions en mémoire, rate limiting désactivé, SMTP supprimé ;
- la base est **reconstruite et re-seedée avant chaque test** → aucun état
  résiduel, tests exécutables dans n'importe quel ordre ;
- `admin` / `student` : sessions de test déjà authentifiées (login → code 2FA
  lu en base → cookies posés + en-tête CSRF injecté sur le client).
"""

import os

# --- Environnement déterministe AVANT l'import de config.py -----------------
os.environ['FLASK_ENV'] = 'testing'
os.environ.pop('REDIS_URL', None)             # sessions : store mémoire
os.environ.pop('RATELIMIT_STORAGE_URI', None)  # rate limiting : pas de Redis

import pytest  # noqa: E402
from sqlalchemy import event  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402

from app import create_app, seeds  # noqa: E402
from app.models.two_factor import TwoFactorCode  # noqa: E402
from app.services import session_service  # noqa: E402
from extensions import db  # noqa: E402


@event.listens_for(Engine, "connect")
def _sqlite_enforce_foreign_keys(dbapi_connection, _record):
    """
    SQLite n'applique PAS les clés étrangères par défaut : sans ce pragma,
    les tests d'intégrité FK passeraient à côté d'erreurs réelles (Postgres,
    lui, les applique).
    """
    import sqlite3
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


# ---------------------------------------------------------------------------
# Application & données
# ---------------------------------------------------------------------------

@pytest.fixture(scope='session')
def app():
    """Application Flask de config « testing », créée une seule fois."""
    application = create_app('testing')
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture(autouse=True)
def fresh_data(app):
    """Base vierge + seeds avant chaque test (isolation totale)."""
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()
        seeds.seed_all()
        # Le store de sessions (mémoire) vit dans le processus : il doit être
        # vidé, sinon les sessions des tests précédents survivent à l'analyse
        # de /api/auth/sessions.
        session_service.init_session_store(app)
    yield
    with app.app_context():
        db.session.remove()


@pytest.fixture(autouse=True)
def app_ctx(app):
    """Contexte d'application : les tests manipulent les modèles directement."""
    with app.app_context():
        yield


@pytest.fixture
def client(app):
    """Client HTTP anonyme (les cookies sont conservés entre requêtes)."""
    return app.test_client()


# ---------------------------------------------------------------------------
# Authentification
# ---------------------------------------------------------------------------

class AuthSession:
    """Client de test authentifié : cookies de session + en-tête CSRF."""

    def __init__(self, client, user_id, csrf_token, username):
        self.client = client
        self.user_id = user_id
        self.csrf_token = csrf_token
        self.username = username
        # Toutes les requêtes suivantes portent le token CSRF (mutations)
        client.environ_base['HTTP_X_CSRF_TOKEN'] = csrf_token

    def get(self, path, **kwargs):
        return self.client.get(path, **kwargs)

    def post(self, path, json=None, **kwargs):
        return self.client.post(path, json=json, **kwargs)

    def put(self, path, json=None, **kwargs):
        return self.client.put(path, json=json, **kwargs)

    def patch(self, path, json=None, **kwargs):
        return self.client.patch(path, json=json, **kwargs)

    def delete(self, path, **kwargs):
        return self.client.delete(path, **kwargs)

    def without_csrf(self):
        """Supprime l'en-tête CSRF du client (test de protection)."""
        self.client.environ_base.pop('HTTP_X_CSRF_TOKEN', None)
        return self

    def user(self):
        """Profil retourné par /api/auth/me."""
        resp = self.get('/api/auth/me')
        assert resp.status_code == 200, resp.get_json()
        return resp.get_json()


def login(app, client, username, password):
    """
    Connexion complète : login → code 2FA (lu en base, pas d'email) →
    verify-2fa (cookies posés). Retourne une AuthSession.
    """
    resp = client.post('/api/auth/login',
                       json={'username': username, 'password': password})
    assert resp.status_code == 200, resp.get_json()
    data = resp.get_json()
    assert data.get('requires_2fa') is True, data
    assert 'access_token' not in data, "aucun JWT ne doit être émis"

    with app.app_context():
        row = (TwoFactorCode.query
               .filter_by(user_id=data['user_id'], verified=False)
               .order_by(TwoFactorCode.created_at.desc())
               .first())
        assert row is not None, "code 2FA non émis par le login"
        code = row.code

    resp = client.post('/api/auth/verify-2fa',
                       json={'user_id': data['user_id'], 'code': code})
    assert resp.status_code == 200, resp.get_json()

    csrf = client.get_cookie(app.config['CSRF_COOKIE_NAME'])
    assert csrf is not None, "cookie CSRF absent après verify-2fa"
    session_cookie = client.get_cookie(app.config['SESSION_COOKIE_NAME'])
    assert session_cookie is not None, "cookie de session absent après verify-2fa"

    return AuthSession(client, data['user_id'], csrf.value, username)


@pytest.fixture
def admin(app, client):
    """Session administrateur (admin / Admin@2024)."""
    return login(app, client, 'admin', 'Admin@2024')


@pytest.fixture
def student(app, client):
    """Session étudiant (etudiant / Demo@2024) — compte de démonstration."""
    return login(app, client, 'etudiant', 'Demo@2024')


@pytest.fixture
def do_login(app, client):
    """Connexion complète à la demande : `do_login('prof', 'Demo@2024')`."""
    def _login(username, password):
        return login(app, client, username, password)
    return _login
