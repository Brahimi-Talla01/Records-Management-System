from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, create_access_token
)
from app.services.auth_service import AuthService
from app.models.user import UserAccount
from app.models.security_alert import SecurityAlert
from extensions import db
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

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Connexion d'un utilisateur
    Body: {username, password, remember_me}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username et password requis'}), 400
        
        username = data.get('username')
        password = data.get('password')
        ip_address = request.remote_addr
        
        # Authentifier l'utilisateur
        user, requires_2fa, error = AuthService.authenticate_user(
            username, password, ip_address
        )
        
        if error:
            return jsonify({'error': error}), 401
        
        # Si 2FA requis
        if requires_2fa:
            return jsonify({
                'message': 'Code de vérification envoyé',
                'requires_2fa': True,
                'user_id': user.user_id
            }), 200
        
        # Générer les tokens
        tokens = AuthService._generate_tokens(user)
        
        return jsonify(tokens), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur login: {str(e)}")
        return jsonify({'error': 'Erreur lors de la connexion'}), 500

@auth_bp.route('/verify-2fa', methods=['POST'])
def verify_2fa():
    """
    Vérifie le code 2FA
    Body: {user_id, code}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('user_id') or not data.get('code'):
            return jsonify({'error': 'user_id et code requis'}), 400
        
        user_id = data.get('user_id')
        code = data.get('code')
        
        tokens, error = AuthService.verify_2fa_and_generate_tokens(user_id, code)
        
        if error:
            return jsonify({'error': error}), 401
        
        return jsonify(tokens), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la vérification'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Rafraîchit le token d'accès"""
    try:
        identity = get_jwt_identity()
        user = UserAccount.query.get(identity)
        
        if not user or not user.is_active:
            return jsonify({'error': 'Utilisateur invalide'}), 401
        
        access_token = create_access_token(
            identity=user.user_id,
            additional_claims={
                'username': user.username,
                'role': user.role.name,
                'department_id': user.department_id
            }
        )
        
        return jsonify({'access_token': access_token}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur refresh: {str(e)}")
        return jsonify({'error': 'Erreur lors du rafraîchissement'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Déconnexion (côté client, suppression du token)"""
    try:
        user_id = get_jwt_identity()
        # Logger l'action
        AuthService._log_audit(user_id, 'logout', 'user_account', user_id)
        
        return jsonify({'message': 'Déconnexion réussie'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur logout: {str(e)}")
        return jsonify({'error': 'Erreur lors de la déconnexion'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Demande de réinitialisation de mot de passe
    Body: {email}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('email'):
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
def reset_password():
    """
    Réinitialise le mot de passe
    Body: {token, new_password}
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('token') or not data.get('new_password'):
            return jsonify({'error': 'Token et nouveau mot de passe requis'}), 400
        
        token = data.get('token')
        new_password = data.get('new_password')
        
        # Valider la force du mot de passe
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

@auth_bp.route('/2fa/enable', methods=['POST'])
@jwt_required()
def enable_2fa():
    """Active le 2FA pour l'utilisateur connecté"""
    try:
        user_id = get_jwt_identity()
        
        success, message = AuthService.enable_2fa(user_id)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur enable 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de l\'activation'}), 500

@auth_bp.route('/2fa/confirm', methods=['POST'])
@jwt_required()
def confirm_enable_2fa():
    """
    Confirme l'activation du 2FA
    Body: {code}
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('code'):
            return jsonify({'error': 'Code requis'}), 400
        
        code = data.get('code')
        
        success, message = AuthService.confirm_enable_2fa(user_id, code)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur confirm 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la confirmation'}), 500

@auth_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    """Désactive le 2FA"""
    try:
        user_id = get_jwt_identity()
        
        success, message = AuthService.disable_2fa(user_id)
        
        if not success:
            return jsonify({'error': message}), 400
        
        return jsonify({'message': message}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur disable 2FA: {str(e)}")
        return jsonify({'error': 'Erreur lors de la désactivation'}), 500

@auth_bp.route('/security-alerts', methods=['GET'])
@jwt_required()
def get_security_alerts():
    """Récupère les alertes de sécurité de l'utilisateur"""
    try:
        user_id = get_jwt_identity()
        
        # Récupérer les alertes non résolues
        alerts = SecurityAlert.query.filter_by(
            user_id=user_id,
            is_resolved=False
        ).order_by(SecurityAlert.created_at.desc()).all()
        
        return jsonify({
            'alerts': [alert.to_dict() for alert in alerts]
        }), 200
    except Exception as e:
        current_app.logger.error(f"Erreur security alerts: {str(e)}")
        return jsonify({'error': 'Erreur lors de la récupération des alertes'}), 500
    

@auth_bp.route('/security-alerts/int:alert_id/resolve', methods=['PUT'])
@jwt_required()
def resolve_security_alert(alert_id):
    """Marque une alerte de sécurité comme résolue"""
    try:
        user_id = get_jwt_identity()
        alert = SecurityAlert.query.get(alert_id)
        
        if not alert:
            return jsonify({'error': 'Alerte non trouvée'}), 404
        
        if alert.user_id != user_id:
            return jsonify({'error': 'Non autorisé'}), 403
        
        alert.is_resolved = True
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = user_id
        
        db.session.commit()
        
        return jsonify({'message': 'Alerte résolue avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur resolve alert: {str(e)}")
        return jsonify({'error': 'Erreur lors de la résolution'}), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password(): 
    """
    Change le mot de passe de l'utilisateur connecté
    Body: {current_password, new_password}
    """
    try: 
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Mot de passe actuel et nouveau requis'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # Récupérer l'utilisateur
        user = UserAccount.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        # Vérifier le mot de passe actuel
        if not user.check_password(current_password):
            return jsonify({'error': 'Mot de passe actuel incorrect'}), 401
        
        # Valider le nouveau mot de passe
        valid, error_msg = validate_password_strength(new_password)
        if not valid:
            return jsonify({'error': error_msg}), 400
        
        # Changer le mot de passe
        user.set_password(new_password)
        db.session.commit()
        
        # Logger l'action
        AuthService._log_audit(user_id, 'password_changed', 'user_account', user_id)
        
        return jsonify({'message': 'Mot de passe changé avec succès'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Erreur change password: {str(e)}")
        return jsonify({'error': 'Erreur lors du changement'}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Récupère les informations de l'utilisateur connecté"""
    try:
        user_id = get_jwt_identity()
        user = UserAccount.query.get(user_id)
        if not user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 404
        
        return jsonify(user.to_dict(include_sensitive=True)), 200
            
    except Exception as e:
        current_app.logger.error(f"Erreur get current user: {str(e)}")
        return jsonify({'error': 'Erreur lors de la récupération'}), 500