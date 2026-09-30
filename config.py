import os
from datetime import timedelta
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()


class Config:
    """Configuration de base"""

    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Base de données PostgreSQL (Neon en prod)
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # ------------------------------------------------------------------
    # Sessions opaques (remplacent les JWT)
    # ------------------------------------------------------------------
    # Nom du cookie portant l'ID de session
    SESSION_COOKIE_NAME = os.environ.get('SESSION_COOKIE_NAME', 'uniarchive_session')
    # Cookie CSRF lisible par JS (double-submit) + header attendu
    CSRF_COOKIE_NAME = os.environ.get('CSRF_COOKIE_NAME', 'uniarchive_csrf')
    CSRF_HEADER_NAME = os.environ.get('CSRF_HEADER_NAME', 'X-CSRF-Token')
    # Durée de vie de la session (glissante) : 7 jours par défaut
    SESSION_TTL_SECONDS = int(os.environ.get('SESSION_TTL_SECONDS', 7 * 24 * 3600))
    # Cookie de session supprimé à la fermeture du navigateur ?
    SESSION_COOKIE_SESSION_ONLY = os.environ.get('SESSION_COOKIE_SESSION_ONLY', 'false').lower() == 'true'
    # Secure : à forcer en prod via SESSION_COOKIE_SECURE=true (HTTPS uniquement)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    # Redis (optionnel : fallback mémoire si absent/indisponible)
    REDIS_URL = os.environ.get('REDIS_URL')

    # ------------------------------------------------------------------
    # Rate limiting (Flask-Limiter)
    # ------------------------------------------------------------------
    RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI') or os.environ.get('REDIS_URL') or 'memory://'
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT', '200 per minute')

    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'}

    # Pagination
    ITEMS_PER_PAGE = 20

    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')

    # Frontend URL (liens dans les emails)
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # Sécurité
    BCRYPT_LOG_ROUNDS = 12

    # Talisman : redirection HTTPS (à activer uniquement quand le stack est
    # derrière un terminateur TLS qui transmet X-Forwarded-Proto).
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'false').lower() == 'true'
    # Derrière un reverse proxy (nginx) : faire confiance aux headers X-Forwarded-*
    BEHIND_PROXY = os.environ.get('BEHIND_PROXY', 'false').lower() == 'true'


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = False


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    # Permet de désactiver le flag Secure derrière un proxy HTTP local (docker)
    # ou de le forcer explicitement : SESSION_COOKIE_SECURE=false|true
    _secure = os.environ.get('SESSION_COOKIE_SECURE')
    if _secure is not None:
        SESSION_COOKIE_SECURE = _secure.lower() == 'true'


class TestingConfig(Config):
    TESTING = True
    SESSION_TTL_SECONDS = 3600
    RATELIMIT_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
