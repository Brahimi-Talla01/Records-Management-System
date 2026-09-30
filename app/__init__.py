from flask import Flask
from flask_migrate import Migrate
from config import config
from extensions import db, bcrypt, cors, mail, limiter

migrate = Migrate()


def create_app(config_name='default'):
    """Factory pour créer l'application Flask"""
    application = Flask(__name__)

    # Charger la configuration
    application.config.from_object(config[config_name])

    # Sécurité : en production, refuser les secrets par défaut du développement
    if config_name == 'production':
        if application.config['SECRET_KEY'] == 'dev-secret-key-change-in-production':
            raise RuntimeError(
                "SECRET_KEY doit être défini via la variable d'environnement en production."
            )
        if not application.config.get('SQLALCHEMY_DATABASE_URI'):
            raise RuntimeError("DATABASE_URL doit être défini en production.")

    # Initialiser les extensions
    db.init_app(application)
    migrate.init_app(application, db)
    bcrypt.init_app(application)
    # CORS : origine(s) du frontend (env + defaults dev 5173/3000)
    _frontend_origins = [
        application.config.get('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5173',
        'http://localhost:3000',
    ]
    cors.init_app(application, resources={
        r"/api/*": {
            "origins": list(dict.fromkeys(_frontend_origins)),
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "X-CSRF-Token", "Authorization"],
            "supports_credentials": True,  # obligatoire pour les cookies de session
        }
    }, supports_credentials=True)
    mail.init_app(application)

    # Headers de sécurité (Talisman) — redirection HTTPS seulement si FORCE_HTTPS
    from flask_talisman import Talisman
    Talisman(
        application,
        force_https=application.config.get('FORCE_HTTPS', False),
        strict_transport_security=application.config.get('FORCE_HTTPS', False),
        content_security_policy={
            'default-src': ["'self'"],
            'img-src': ["'self'", 'data:'],
            'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            'font-src': ["'self'", 'https://fonts.gstatic.com'],
        },
    )

    # Derrière un reverse proxy : faire confiance aux headers X-Forwarded-*
    if application.config.get('BEHIND_PROXY'):
        from werkzeug.middleware.proxy_fix import ProxyFix
        application.wsgi_app = ProxyFix(application.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Rate limiting : le storage vient de app.config['RATELIMIT_STORAGE_URI']
    # (config.py → env RATELIMIT_STORAGE_URI / REDIS_URL / memory://).
    # L'ancienne ligne `limiter.storage_uri = ...` était sans effet : Flask-Limiter
    # ne lit jamais cet attribut (il lit `self._storage_uri` et la config).
    limiter.init_app(application)

    # Store de sessions (Redis si disponible, sinon mémoire)
    from app.services.session_service import init_session_store
    init_session_store(application)

    # IMPORTANT: Importer tous les modèles APRÈS l'initialisation de db
    with application.app_context():
        import app.models

    # Enveloppe d'erreur standardisée ({"error","code","details"}) + normalisation
    from app.errors import register_error_handlers
    register_error_handlers(application)

    # Enregistrer les blueprints
    from app.auth.routes import auth_bp
    application.register_blueprint(auth_bp)

    # Enregistrer le blueprint users
    from app.users.routes import users_bp
    application.register_blueprint(users_bp)

    # Enregistrer les blueprints documents / dashboard / search
    from app.documents.routes import documents_bp
    from app.dashboard.routes import dashboard_bp
    from app.search.routes import search_bp
    application.register_blueprint(documents_bp, url_prefix='/api/documents')
    application.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    application.register_blueprint(search_bp, url_prefix='/api/search')

    # Commandes CLI (flask seed roles|folders|doctypes|departments|admin|demo|all)
    from app.cli import register_commands
    register_commands(application)

    # Route de santé
    @application.route('/health')
    def health():
        return {'status': 'ok'}, 200

    return application
