"""
Routes d'authentification par session opaque.

Changements vs version JWT :
- login/verify-2fa posent des cookies (session HTTPOnly + CSRF lisible) au lieu
  de retourner des tokens.
- logout révoque réellement la session côté serveur.
- /me s'appuie sur la session.
- Nouveaux endpoints : GET /sessions, DELETE /sessions (déconnexion partout),
  POST /sessions/revoke (révoquer une session précise).
"""

from flask import Blueprint, request, jsonify, current_app

from app.models.user import UserAccount
from app.models.security_alert import SecurityAlert
from app.auth.services import AuthService
from app.services import session_service
from app.auth.session_auth import (
    session_required,
    get_current_user,
    get_session_id,
)
from extensions import db, limiter
import re
from datetime import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def validate_email(email):
    """Valide le format d'un email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password):
    """Valide la force du mot de passe"""
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    if not re.search(r'[A-Z]', password):
        return False, "Le mot de passe doit contenir au moins une majuscule"
    if not re.search(r'[a-z]', password):
        return False, "Le mot de passe doit contenir au moins une minuscule"
    if not re.search(r'\d', password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    return True, None


# -----------------------------------------------------------------------------
# Cookies de session
# -----------------------------------------------------------------------------


def _set_session_cookies(response, session_id, csrf_token):
    """Pose le cookie de session (HTTPOnly) et le cookie CSRF (lisible)."""
    cfg = current_app.config
    secure = cfg.get('SESSION_COOKIE_SECURE', False)
    samesite = cfg.get('SESSION_COOKIE_SAMESITE', 'Lax')

    max_age = None if cfg.get('SESSION_COOKIE_SESSION_ONLY') else cfg['SESSION_TTL_SECONDS']

    response.set_cookie(
        cfg['SESSION_COOKIE_NAME'],
        session_id,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path='/',
    )
    response.set_cookie(
        cfg['CSRF_COOKIE_NAME'],
        csrf_token,
        max_age=max_age,
        httponly=False,  # lisible par le frontend (double-submit)
        secure=secure,
        samesite=samesite,
        path='/',
    )
    return response


def _clear_session_cookies(response):
    cfg = current_app.config
    for name in (cfg['SESSION_COOKIE_NAME'], cfg['CSRF_COOKIE_NAME']):
        response.set_cookie(
            name,
            '',
            expires=0,
            httponly=(name == cfg['SESSION_COOKIE_NAME']),
            secure=cfg.get('SESSION_COOKIE_SECURE', False),
            samesite=cfg.get('SESSION_COOKIE_SAMESITE', 'Lax'),
            path='/',
        )
    return response


def _session_created_response(user, message=None):
    """Crée la session + pose les cookies + réponse JSON utilisateur."""
    session = session_service.create_session(
        user_id=user.user_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
    )
    resp = jsonify({
        'message': message or 'Authentification réussie',
        'user': user.to_dict(),
    })
    _set_session_cookies(resp, session['session_id'], session['csrf_token'])
    return resp


# -----------------------------------------------------------------------------
# Connexion / 2FA
# -----------------------------------------------------------------------------


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('5 per minute')
def login():
    """
    Connexion : {username, password}
    Réponse : {requires_2fa: true, user_id} — la session n'est créée
    qu'après la vérification 2FA.
    """
    try:
        data = request.get_json() or {}
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username et password requis'}), 400

        user, requires_2fa, error = AuthService.authenticate_user(
            data.get('username'), data.get('password'), request.remote_addr
        )
        # Contrat de authenticate_user : `user` n'est renvoyé que si `error` est None.
        if error or user is None:
            return jsonify({'error': error or 'Authentification impossible'}), 401

        if requires_2fa:
            return jsonify({
                'message': 'Code de vérification envoyé',
                'requires_2fa': True,
                'user_id': user.user_id,
            }), 200

        # (parcours sans 2FA si un jour désactivé globalement)
        return _session_created_response(user)

    except Exception as e:
        current_app.logger.error(f"Erreur login: {str(e)}")
        return jsonify({'error': 'Erreur lors de la connexion'}), 500


@auth_bp.route('/verify-2fa', methods=['POST'])
@limiter.limit('10 per minute')
def verify_2fa():
    """Vérifie le code 2FA puis crée la session (cookies posés)."""
    try:
        data = request.get_json() or {}
        if not data.get('user_id') or not data.get('code'):
            return jsonify({'error': 'user_id et code requis'}), 400

        user, error = AuthService.verify_2fa(
            data.get('user_id'), data.get('code')
        )
        if error:
            return jsonify({'error': error}), 401

        return _session_created_response(user, 'Authentification réussie')

    except Exception as e:
        current_app.logger.error(f"Erreur 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la vérification'}), 500


# -----------------------------------------------------------------------------
# Session courante
# -----------------------------------------------------------------------------


@auth_bp.route('/me', methods=['GET'])
@session_required
def get_current_user_route():
    """Profil de l'utilisateur connecté (source de vérité pour le frontend)."""
    user = get_current_user()
    return jsonify(user.to_dict(include_sensitive=True)), 200


@auth_bp.route('/logout', methods=['POST'])
@session_required
def logout():
    """Révoque la session courante et supprime les cookies."""
    session_id = get_session_id()
    user = get_current_user()
    session_service.revoke_session(session_id)
    AuthService._log_audit(user.user_id, 'logout', 'user_account', user.user_id)

    resp = jsonify({'message': 'Déconnexion réussie'})
    _clear_session_cookies(resp)
    return resp, 200


@auth_bp.route('/session/extend', methods=['POST'])
@session_required
def extend_session():
    """Prolonge la session courante (TTL glissant déjà automatique)."""
    return jsonify({'message': 'Session prolongée'}), 200


# -----------------------------------------------------------------------------
# Gestion des sessions (listing / révocation)
# -----------------------------------------------------------------------------


@auth_bp.route('/sessions', methods=['GET'])
@session_required
def list_sessions():
    """Liste les sessions actives de l'utilisateur connecté."""
    user = get_current_user()
    sessions = session_service.list_user_sessions(user.user_id)
    return jsonify({'sessions': sessions}), 200


@auth_bp.route('/sessions', methods=['DELETE'])
@session_required
def revoke_all_sessions():
    """Déconnexion partout : révoque toutes les sessions de l'utilisateur."""
    user = get_current_user()
    count = session_service.revoke_all_for_user(user.user_id)
    AuthService._log_audit(user.user_id, 'logout_all_sessions', 'user_account', user.user_id)

    resp = jsonify({'message': f'{count} session(s) révoquée(s)'})
    _clear_session_cookies(resp)
    return resp, 200


@auth_bp.route('/sessions/revoke', methods=['POST'])
@session_required
def revoke_one_session():
    """Révoque une session précise (préfixe d'ID renvoyé par /sessions)."""
    user = get_current_user()
    data = request.get_json() or {}
    prefix = data.get('session_id')
    if not prefix:
        return jsonify({'error': 'session_id requis'}), 400

    # Le listing n'expose qu'un préfixe ; on retrouve la session complète
    for entry in session_service.session_store.list_for_user(user.user_id):
        if entry['session_id'].startswith(prefix.rstrip('…')):
            session_service.revoke_session(entry['session_id'])
            return jsonify({'message': 'Session révoquée'}), 200

    return jsonify({'error': 'Session non trouvée'}), 404


# -----------------------------------------------------------------------------
# Refresh token (compat temporaires) : endpoint retiré
# -----------------------------------------------------------------------------


# -----------------------------------------------------------------------------
# Mot de passe
# -----------------------------------------------------------------------------


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('5 per minute')
def forgot_password():
    """Demande de réinitialisation de mot de passe : {email}"""
    try:
        data = request.get_json() or {}
        if not data.get('email'):
            return jsonify({'error': 'Email requis'}), 400

        email = data.get('email')
        if not validate_email(email):
            return jsonify({'error': 'Email invalide'}), 400

        success, message = AuthService.request_password_reset(email)
        return jsonify({'message': message}), 200

    except Exception as e:
        current_app.logger.error(f"Erreur forgot password: {str(e)}")
        return jsonify({'error': 'Erreur lors de la demande'}), 500


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('5 per minute')
def reset_password():
    """Réinitialise le mot de passe : {token, new_password}"""
    try:
        data = request.get_json() or {}
        if not data.get('token') or not data.get('new_password'):
            return jsonify({'error': 'Token et nouveau mot de passe requis'}), 400

        token = data.get('token')
        new_password = data.get('new_password')

        valid, error_msg = validate_password_strength(new_password)
        if not valid:
            return jsonify({'error': error_msg}), 400

        success, message = AuthService.reset_password(token, new_password)
        if not success:
            return jsonify({'error': message}), 400

        return jsonify({'message': message}), 200

    except Exception as e:
        current_app.logger.error(f"Erreur reset password: {str(e)}")
        return jsonify({'error': 'Erreur lors de la réinitialisation'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@session_required
def change_password():
    """Change le mot de passe de l'utilisateur connecté."""
    try:
        user = get_current_user()
        data = request.get_json() or {}
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Mot de passe actuel et nouveau requis'}), 400

        if not user.check_password(data.get('current_password')):
            return jsonify({'error': 'Mot de passe actuel incorrect'}), 401

        valid, error_msg = validate_password_strength(data.get('new_password'))
        if not valid:
            return jsonify({'error': error_msg}), 400

        user.set_password(data.get('new_password'))
        db.session.commit()
        AuthService._log_audit(user.user_id, 'password_changed', 'user_account', user.user_id)

        return jsonify({'message': 'Mot de passe changé avec succès'}), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur change password: {str(e)}")
        return jsonify({'error': 'Erreur lors du changement'}), 500


# -----------------------------------------------------------------------------
# 2FA (activation / désactivation)
# -----------------------------------------------------------------------------


@auth_bp.route('/2fa/enable', methods=['POST'])
@session_required
def enable_2fa():
    try:
        user = get_current_user()
        success, message = AuthService.enable_2fa(user.user_id)
        if not success:
            return jsonify({'error': message}), 400
        return jsonify({'message': message}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur enable 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de l\'activation'}), 500


@auth_bp.route('/2fa/confirm', methods=['POST'])
@session_required
def confirm_enable_2fa():
    try:
        user = get_current_user()
        data = request.get_json() or {}
        if not data.get('code'):
            return jsonify({'error': 'Code requis'}), 400

        success, message = AuthService.confirm_enable_2fa(user.user_id, data.get('code'))
        if not success:
            return jsonify({'error': message}), 400
        return jsonify({'message': message}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur confirm 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la confirmation'}), 500


@auth_bp.route('/2fa/disable', methods=['POST'])
@session_required
def disable_2fa():
    try:
        user = get_current_user()
        success, message = AuthService.disable_2fa(user.user_id)
        if not success:
            return jsonify({'error': message}), 400
        return jsonify({'message': message}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur disable 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la désactivation'}), 500


# -----------------------------------------------------------------------------
# Alertes de sécurité
# -----------------------------------------------------------------------------


@auth_bp.route('/security-alerts', methods=['GET'])
@session_required
def get_security_alerts():
    try:
        user = get_current_user()
        alerts = SecurityAlert.query.filter_by(
            user_id=user.user_id,
            is_resolved=False,
        ).order_by(SecurityAlert.created_at.desc()).all()
        return jsonify({'alerts': [a.to_dict() for a in alerts]}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur security alerts: {str(e)}")
        return jsonify({'error': 'Erreur lors de la récupération des alertes'}), 500


@auth_bp.route('/security-alerts/<int:alert_id>/resolve', methods=['PUT'])
@session_required
def resolve_security_alert(alert_id):
    try:
        user = get_current_user()
        alert = SecurityAlert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alerte non trouvée'}), 404
        if alert.user_id != user.user_id:
            return jsonify({'error': 'Non autorisé'}), 403

        alert.is_resolved = True
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = user.user_id
        db.session.commit()
        return jsonify({'message': 'Alerte résolue avec succès'}), 200
    except Exception as e:
        current_app.logger.error(f"Erreur resolve alert: {str(e)}")
        return jsonify({'error': 'Erreur lors de la résolution'}), 500
