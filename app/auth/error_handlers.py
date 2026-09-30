"""
Gestionnaires d'erreurs globaux (remplacent les error handlers JWT).
"""

from flask import jsonify


def register_error_handlers(application):
    """Enregistre les gestionnaires d'erreurs communs."""

    @application.errorhandler(401)
    def handle_unauthorized(_e):
        return jsonify({'error': 'Authentification requise'}), 401

    @application.errorhandler(403)
    def handle_forbidden(_e):
        return jsonify({'error': 'Accès interdit'}), 403

    @application.errorhandler(404)
    def handle_not_found(_e):
        return jsonify({'error': 'Ressource non trouvée'}), 404

    @application.errorhandler(429)
    def handle_rate_limited(_e):
        return jsonify({'error': 'Trop de requêtes. Veuillez patienter.'}), 429

    @application.errorhandler(500)
    def handle_server_error(_e):
        return jsonify({'error': 'Erreur interne du serveur'}), 500
