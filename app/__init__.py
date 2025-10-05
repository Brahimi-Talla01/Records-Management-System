from flask import Flask
from flask_migrate import Migrate
from config import config
from extensions import db, bcrypt, jwt, cors, mail

migrate = Migrate()

def create_app(config_name='default'):
    """Factory pour créer l'application Flask"""
    application = Flask(__name__)
    
    # Charger la configuration
    application.config.from_object(config[config_name])
    
    # Initialiser les extensions
    db.init_app(application)
    migrate.init_app(application, db)  # Ajouter Flask-Migrate
    bcrypt.init_app(application)
    jwt.init_app(application)
    cors.init_app(application, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000", "http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    mail.init_app(application)
    
    # IMPORTANT: Importer tous les modèles APRÈS l'initialisation de db
    with application.app_context():
        import app.models
    
    # Enregistrer les gestionnaires d'erreurs JWT
    from app.auth.error_handlers import register_jwt_error_handlers
    register_jwt_error_handlers(application)
    
    # Enregistrer les blueprints
    from app.auth.routes import auth_bp
    application.register_blueprint(auth_bp)
    
    # Callbacks JWT
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        return user
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        from app.models.user import UserAccount
        identity = jwt_data["sub"]
        return UserAccount.query.get(identity)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        from flask import jsonify
        return jsonify({
            'error': 'Token expiré',
            'message': 'Veuillez vous reconnecter'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        from flask import jsonify
        return jsonify({
            'error': 'Token invalide',
            'message': str(error)
        }), 422
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        from flask import jsonify
        return jsonify({
            'error': 'Authentification requise',
            'message': str(error)
        }), 401
    
    # Route de santé
    @application.route('/health')
    def health():
        return {'status': 'ok'}, 200
    
    return application