"""
Configuration applicative (plan07 — P0.3).

Remplace l'ancien `tests/test_config.py` qui imprimait des valeurs (dont un
`JWT_SECRET_KEY` devenu obsolète) sans rien vérifier.
"""

import os
import subprocess
import sys

from config import Config, TestingConfig, config

FIFTY_MB = 50 * 1024 * 1024


def test_registre_des_environnements():
    assert set(config) == {'development', 'production', 'testing', 'default'}
    assert config['default'] is config['development']


def test_cookies_et_csrf():
    assert Config.SESSION_COOKIE_NAME == 'uniarchive_session'
    assert Config.CSRF_COOKIE_NAME == 'uniarchive_csrf'
    assert Config.CSRF_HEADER_NAME == 'X-CSRF-Token'
    # Le cookie de session est lisible uniquement par le serveur
    assert Config.SESSION_COOKIE_SESSION_ONLY is False


def test_duree_de_vie_de_session():
    assert Config.SESSION_TTL_SECONDS == 7 * 24 * 3600


def test_configuration_des_uploads():
    assert Config.UPLOAD_FOLDER.endswith('uploads')
    assert Config.MAX_CONTENT_LENGTH == FIFTY_MB
    assert {'pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'} <= Config.ALLOWED_EXTENSIONS


def test_configuration_de_test():
    """Le profil de test ne doit dépendre ni de Redis, ni de SMTP.

    La base, elle, est SQLite en local mais bascule sur PostgreSQL quand la
    CI définit `TEST_DATABASE_URL` (le reste du contrat reste identique).
    """
    assert TestingConfig.TESTING is True
    expected_uri = os.environ.get('TEST_DATABASE_URL') or 'sqlite://'
    assert TestingConfig.SQLALCHEMY_DATABASE_URI == expected_uri
    assert TestingConfig.REDIS_URL is None
    assert TestingConfig.RATELIMIT_ENABLED is False
    assert TestingConfig.MAIL_SUPPRESS_SEND is True
    assert TestingConfig.BCRYPT_LOG_ROUNDS <= 5  # hash rapide pour les tests


def _create_app_in_subprocess(env_overrides):
    """Lance create_app('production') dans un sous-processus avec un env donné."""
    env = {**os.environ, **env_overrides}
    code = (
        "from app import create_app; create_app('production');"
        "print('CREATED')"
    )
    return subprocess.run(
        [sys.executable, '-c', code],
        capture_output=True, text=True, env=env, timeout=60,
    )


def test_production_refuse_le_secret_de_developpement():
    """SECRET_KEY par défaut => refus explicite au démarrage en production."""
    result = _create_app_in_subprocess({'SECRET_KEY': ''})

    assert result.returncode != 0
    assert 'CREATED' not in result.stdout
    assert 'SECRET_KEY' in result.stderr


def test_production_exige_la_base_de_donnees():
    """DATABASE_URL absente => refus explicite (après le contrôle du secret)."""
    result = _create_app_in_subprocess({
        'SECRET_KEY': 'une-cle-de-production-suffisamment-longue',
        'DATABASE_URL': '',
    })

    assert result.returncode != 0
    assert 'CREATED' not in result.stdout
    assert 'DATABASE_URL' in result.stderr
