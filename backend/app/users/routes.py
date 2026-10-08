from flask import Blueprint, request, jsonify, send_file
from werkzeug.exceptions import HTTPException
from app.users.services import UserService
from app.auth.session_auth import session_required, get_current_user
from app.auth.decorators import admin_required
from app.errors import AppError
from app.models.role import Role
from app.models.department import Department
import io

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


def _parse_filters():
    """Filtres de liste/export, parsés une seule fois (aucun appel dupliqué)."""
    filters = {}
    search = request.args.get('search')
    if search:
        filters['search'] = search
    role_id = request.args.get('role_id', type=int)
    if role_id is not None:
        filters['role_id'] = role_id
    department_id = request.args.get('department_id', type=int)
    if department_id is not None:
        filters['department_id'] = department_id
    is_active = request.args.get('is_active')
    if is_active:
        filters['is_active'] = is_active.lower() == 'true'
    return filters


@users_bp.route('', methods=['GET'])
@session_required
@admin_required
def get_users():
    """Liste les utilisateurs du périmètre de l'administrateur"""
    try:
        # Paramètres de pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        result = UserService.get_all_users(page, per_page, _parse_filters())
        return jsonify(result), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@session_required
@admin_required
def get_user(user_id):
    """Récupère un utilisateur par son ID"""
    try:
        user, error = UserService.get_user_by_id(user_id)
        if error:
            return jsonify({'error': error}), 404
        return jsonify(user), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('', methods=['POST'])
@session_required
@admin_required
def create_user():
    """Crée un nouvel utilisateur"""
    try:
        data = request.get_json()
        current_user_id = get_current_user().user_id
        
        user, error = UserService.create_user(data, current_user_id)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(user), 201
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@session_required
@admin_required
def update_user(user_id):
    """Met à jour un utilisateur"""
    try:
        data = request.get_json()
        current_user_id = get_current_user().user_id
        
        user, error = UserService.update_user(user_id, data, current_user_id)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(user), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@session_required
@admin_required
def delete_user(user_id):
    """Supprime un utilisateur"""
    try:
        current_user_id = get_current_user().user_id
        success, message = UserService.delete_user(user_id, current_user_id)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@session_required
@admin_required
def reset_user_password(user_id):
    """Réinitialise le mot de passe d'un utilisateur"""
    try:
        data = request.get_json()
        new_password = data.get('new_password', 'ChangeMe@123')
        current_user_id = get_current_user().user_id
        
        success, message = UserService.reset_password(user_id, new_password, current_user_id)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message, 'temporary_password': new_password}), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/import', methods=['POST'])
@session_required
@admin_required
def import_users():
    """Importe des utilisateurs depuis un CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Aucun fichier fourni'}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({'error': 'Nom de fichier vide'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Le fichier doit être un CSV'}), 400
        
        current_user_id = get_current_user().user_id
        file_content = file.read()
        
        results, error = UserService.import_users_from_csv(file_content, current_user_id)
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify(results), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/export', methods=['GET'])
@session_required
@admin_required
def export_users():
    """Exporte les utilisateurs en CSV"""
    try:
        # Mêmes filtres que la liste (hérite des paramètres d'URL)
        csv_data = UserService.export_users_to_csv(_parse_filters())
        
        # Créer un buffer
        buffer = io.BytesIO()
        buffer.write(csv_data.encode('utf-8'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='text/csv',
            as_attachment=True,
            download_name='users_export.csv'
        )
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/statistics', methods=['GET'])
@session_required
@admin_required
def get_statistics():
    """Récupère les statistiques des utilisateurs"""
    try:
        stats = UserService.get_user_statistics()
        return jsonify(stats), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/roles', methods=['GET'])
@session_required
def get_roles():
    """Récupère tous les rôles"""
    try:
        roles = Role.query.all()
        return jsonify([role.to_dict() for role in roles]), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/departments', methods=['GET'])
@session_required
def get_departments():
    """Récupère tous les départements"""
    try:
        departments = Department.query.all()
        return jsonify([dept.to_dict() for dept in departments]), 200
    except (HTTPException, AppError):
        raise  # 400/403/404/413/415/422 : servis tels quels
    except Exception as e:
        return jsonify({'error': str(e)}), 500
