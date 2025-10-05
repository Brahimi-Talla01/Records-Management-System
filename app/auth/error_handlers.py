from flask import jsonify
from flask_jwt_extended.exceptions import (
    NoAuthorizationError, 
    InvalidHeaderError,
    JWTDecodeError,
    CSRFError
)
from jwt.exceptions import ExpiredSignatureError

def register_jwt_error_handlers(application):
    """Enregistre les gestionnaires d'erreurs JWT"""
    
    @application.errorhandler(NoAuthorizationError)
    def handle_no_authorization_error(e):
        return jsonify({'error': 'Token d\'authentification manquant'}), 401
    
    @application.errorhandler(InvalidHeaderError)
    def handle_invalid_header_error(e):
        return jsonify({'error': 'Format du token invalide'}), 422
    
    @application.errorhandler(JWTDecodeError)
    def handle_jwt_decode_error(e):
        return jsonify({'error': 'Token invalide'}), 422
    
    @application.errorhandler(ExpiredSignatureError)
    def handle_expired_signature_error(e):
        return jsonify({'error': 'Token expiré'}), 401
    
    @application.errorhandler(CSRFError)
    def handle_csrf_error(e):
        return jsonify({'error': 'Token CSRF invalide'}), 401