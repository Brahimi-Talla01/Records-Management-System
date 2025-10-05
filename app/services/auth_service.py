from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token
from extensions import db
from app.models.user import UserAccount
from app.models.two_factor import TwoFactorCode
from app.models.password_reset import PasswordResetToken
from app.models.security_alert import SecurityAlert
from app.models.audit import AuditLog
from datetime import datetime, timedelta
import json

class AuthService:
    
    @staticmethod
    def authenticate_user(username_or_email, password, ip_address=None):
        """
        Authentifie un utilisateur
        Retourne: (user, requires_2fa, error_message)
        """
        # Chercher l'utilisateur
        user = UserAccount.query.filter(
            (UserAccount.username == username_or_email) | 
            (UserAccount.email == username_or_email)
        ).first()
        
        if not user:
            AuthService._log_failed_attempt(username_or_email, ip_address, 'user_not_found')
            return None, False, "Identifiants invalides"
        
        if not user.is_active:
            return None, False, "Compte désactivé"
        
        # Vérifier le mot de passe
        if not user.check_password(password):
            AuthService._log_failed_attempt(username_or_email, ip_address, 'invalid_password')
            AuthService._check_multiple_failed_attempts(user.user_id, ip_address)
            return None, False, "Identifiants invalides"
        
        # Si 2FA est activé, ne pas créer de token tout de suite
        if user.two_fa_enabled:
            # Générer un code 2FA
            two_fa_code = TwoFactorCode.create_for_user(user.user_id)
            AuthService._send_2fa_code(user, two_fa_code.code)
            return user, True, None
        
        # Mettre à jour la dernière connexion
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Logger l'action
        AuthService._log_audit(user.user_id, 'login', 'user_account', user.user_id)
        
        return user, False, None
    
    @staticmethod
    def verify_2fa_and_generate_tokens(user_id, code):
        """Vérifie le code 2FA et génère les tokens"""
        # Chercher le code le plus récent non vérifié
        two_fa = TwoFactorCode.query.filter_by(
            user_id=user_id,
            verified=False
        ).order_by(TwoFactorCode.created_at.desc()).first()
        
        if not two_fa:
            return None, "Code 2FA non trouvé"
        
        if not two_fa.verify_code(code):
            if two_fa.attempts >= 3:
                return None, "Trop de tentatives. Veuillez vous reconnecter."
            return None, f"Code invalide. {3 - two_fa.attempts} tentatives restantes."
        
        # Mettre à jour la dernière connexion
        user = UserAccount.query.get(user_id)
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Générer les tokens
        tokens = AuthService._generate_tokens(user)
        
        # Logger l'action
        AuthService._log_audit(user_id, 'login_2fa_success', 'user_account', user_id)
        
        return tokens, None
    
    @staticmethod
    def _generate_tokens(user):
        """Génère les tokens JWT"""
        access_token = create_access_token(
            identity=user.user_id,
            additional_claims={
                'username': user.username,
                'role': user.role.name,
                'department_id': user.department_id
            }
        )
        refresh_token = create_refresh_token(identity=user.user_id)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }
    
    @staticmethod
    def request_password_reset(email):
        """Crée une demande de réinitialisation de mot de passe"""
        user = UserAccount.query.filter_by(email=email).first()
        
        if not user:
            # Ne pas révéler si l'email existe ou non (sécurité)
            return True, "Si cet email existe, vous recevrez un lien de réinitialisation"
        
        # Créer un token
        reset_token = PasswordResetToken.create_for_user(user.user_id)
        
        # Envoyer l'email
        AuthService._send_reset_email(user, reset_token.token)
        
        # Logger l'action
        AuthService._log_audit(user.user_id, 'password_reset_requested', 'user_account', user.user_id)
        
        return True, "Si cet email existe, vous recevrez un lien de réinitialisation"
    
    @staticmethod
    def reset_password(token, new_password):
        """Réinitialise le mot de passe avec un token"""
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or not reset_token.is_valid():
            return False, "Token invalide ou expiré"
        
        # Mettre à jour le mot de passe
        user = reset_token.user
        user.set_password(new_password)
        
        # Marquer le token comme utilisé
        reset_token.used = True
        
        db.session.commit()
        
        # Logger l'action
        AuthService._log_audit(user.user_id, 'password_reset_completed', 'user_account', user.user_id)
        
        return True, "Mot de passe réinitialisé avec succès"
    
    @staticmethod
    def enable_2fa(user_id):
        """Active le 2FA pour un utilisateur"""
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"
        
        if user.two_fa_enabled:
            return False, "2FA déjà activé"
        
        # Générer un code de vérification
        two_fa_code = TwoFactorCode.create_for_user(user_id)
        AuthService._send_2fa_code(user, two_fa_code.code)
        
        return True, "Code de vérification envoyé"
    
    @staticmethod
    def confirm_enable_2fa(user_id, code):
        """Confirme l'activation du 2FA"""
        two_fa = TwoFactorCode.query.filter_by(
            user_id=user_id,
            verified=False
        ).order_by(TwoFactorCode.created_at.desc()).first()
        
        if not two_fa or not two_fa.verify_code(code):
            return False, "Code invalide"
        
        # Activer le 2FA
        user = UserAccount.query.get(user_id)
        user.two_fa_enabled = True
        db.session.commit()
        
        # Logger l'action
        AuthService._log_audit(user_id, '2fa_enabled', 'user_account', user_id)
        
        return True, "2FA activé avec succès"
    
    @staticmethod
    def disable_2fa(user_id):
        """Désactive le 2FA"""
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"
        
        user.two_fa_enabled = False
        db.session.commit()
        
        # Logger l'action
        AuthService._log_audit(user_id, '2fa_disabled', 'user_account', user_id)
        
        return True, "2FA désactivé"
    
    # Méthodes privées
    
    @staticmethod
    def _send_2fa_code(user, code):
        """Envoie le code 2FA par email ou SMS"""
        # Implémenter l'envoi réel d'email/SMS
        from app.services.email_service import EmailService
        EmailService.send_2fa_code(user.email, code)
    
    @staticmethod
    def _send_reset_email(user, token):
        """Envoie l'email de réinitialisation"""
        from app.services.email_service import EmailService
        reset_url = f"{current_app.config.get('FRONTEND_URL')}/reset-password?token={token}"
        EmailService.send_password_reset(user.email, reset_url)
    
    @staticmethod
    def _log_failed_attempt(username, ip_address, reason):
        """Enregistre une tentative de connexion échouée"""
        # Logger dans audit_log
        audit = AuditLog(
            action='login_failed',
            object_type='authentication',
            metadata=json.dumps({
                'username': username,
                'ip_address': ip_address,
                'reason': reason,
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        db.session.add(audit)
        db.session.commit()
    
    @staticmethod
    def _check_multiple_failed_attempts(user_id, ip_address):
        """Vérifie les tentatives de connexion multiples et crée une alerte"""
        # Compter les tentatives échouées dans les 15 dernières minutes
        fifteen_min_ago = datetime.utcnow() - timedelta(minutes=15)
        
        failed_attempts = AuditLog.query.filter(
            AuditLog.action == 'login_failed',
            AuditLog.user_id == user_id,
            AuditLog.created_at >= fifteen_min_ago
        ).count()
        
        if failed_attempts >= 5:
            # Créer une alerte de sécurité
            alert = SecurityAlert(
                user_id=user_id,
                alert_type='multiple_login_attempts',
                severity='high',
                message=f"Détection de {failed_attempts} tentatives de connexion échouées",
                metadata=json.dumps({
                    'ip_address': ip_address,
                    'attempts': failed_attempts,
                    'time_window': '15 minutes'
                })
            )
            db.session.add(alert)
            db.session.commit()
    
    @staticmethod
    def _log_audit(user_id, action, object_type, object_id):
        """Enregistre une action dans le journal d'audit"""
        audit = AuditLog(
            user_id=user_id,
            action=action,
            object_type=object_type,
            object_id=object_id
        )
        db.session.add(audit)
        db.session.commit()