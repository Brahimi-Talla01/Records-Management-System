"""
Décorateurs d'autorisation basés sur la session opaque.
(remplacent les décorateurs JWT)
"""

from functools import wraps

from flask import jsonify, request

from app.auth.session_auth import session_required, get_current_user, mark_guard


def role_required(*roles):
    """
    Vérifie le rôle de l'utilisateur.
    Usage : @role_required('Admin', 'Prof')
    """
    def decorator(fn):
        @wraps(fn)
        @session_required
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if user.role.name not in roles:
                return jsonify({'error': 'Permission insuffisante'}), 403
            return fn(*args, **kwargs)
        return mark_guard(wrapper, 'role')
    return decorator


def admin_required(fn):
    """Réserve la route aux administrateurs."""
    @wraps(fn)
    @session_required
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if user.role.name != 'Admin':
            return jsonify({'error': 'Accès réservé aux administrateurs'}), 403
        return fn(*args, **kwargs)
    return mark_guard(wrapper, 'admin')


def super_admin_required(fn):
    """Réserve la route au super administrateur (Admin sans campus)."""
    @wraps(fn)
    @session_required
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user.is_super_admin:
            return jsonify({'error': 'Accès réservé au super administrateur'}), 403
        return fn(*args, **kwargs)
    return mark_guard(wrapper, 'super_admin')


def department_access_required(fn):
    """
    Vérifie l'accès au département (kwargs department_id ou query param).
    L'Admin a accès à tous les départements.
    """
    @wraps(fn)
    @session_required
    def wrapper(*args, **kwargs):
        user = get_current_user()

        if user.role.name == 'Admin':
            return fn(*args, **kwargs)

        department_id = kwargs.get('department_id') or request.args.get('department_id')
        if department_id and int(department_id) != user.department_id:
            return jsonify({'error': 'Accès au département non autorisé'}), 403

        return fn(*args, **kwargs)
    return mark_guard(wrapper, 'department')
