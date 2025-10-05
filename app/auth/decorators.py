from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import UserAccount
from flask import request


def role_required(*roles):
    """
    Décorateur pour vérifier le rôle de l'utilisateur
    Usage: @role_required('Admin', 'Prof')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = UserAccount.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({'error': 'Utilisateur non autorisé'}), 403
            
            if user.role.name not in roles:
                return jsonify({'error': 'Permission insuffisante'}), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(fn):
    """
    Décorateur pour vérifier que l'utilisateur est admin
    Usage: @admin_required
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = UserAccount.query.get(user_id)
        
        if not user or not user.is_active or user.role.name != 'Admin':
            return jsonify({'error': 'Accès réservé aux administrateurs'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def department_access_required(fn):
    """
    Décorateur pour vérifier l'accès au département
    L'ID du département doit être dans les kwargs ou query params
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = UserAccount.query.get(user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Utilisateur non autorisé'}), 403
        
        # Admin a accès à tous les départements
        if user.role.name == 'Admin':
            return fn(*args, **kwargs)
        
        # Vérifier l'accès au département
        department_id = kwargs.get('department_id') or request.args.get('department_id')
        
        if department_id and int(department_id) != user.department_id:
            return jsonify({'error': 'Accès au département non autorisé'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def active_user_required(fn):
    """
    Décorateur pour vérifier que l'utilisateur est actif
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = UserAccount.query.get(user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Compte désactivé'}), 403
        
        return fn(*args, **kwargs)
    return wrapper