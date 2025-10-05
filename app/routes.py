from flask import Blueprint

# Ce fichier peut servir pour des routes générales
main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return {
        'message': 'UniArchive API',
        'version': '1.0.0',
        'status': 'running'
    }, 200