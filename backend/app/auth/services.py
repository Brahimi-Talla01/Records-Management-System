from flask import current_app
from extensions import db
from app.models.user import UserAccount
from app.models.two_factor import TwoFactorCode
from app.models.password_reset import PasswordResetToken
from app.models.security_alert import SecurityAlert
from app.models.audit import AuditLog
from app.services import audit_service
from app.users.repositories import UserRepository
from datetime import datetime, timedelta


class AuthService:

    @staticmethod
    def authenticate_user(username_or_email, password, ip_address=None):
        """
        Authentifie un utilisateur.
        Retourne: (user, requires_2fa, error_message)
        """
        user = UserRepository.find_by_username_or_email(username_or_email)

        if not user:
            AuthService._log_failed_attempt(username_or_email, ip_address, 'user_not_found')
            return None, False, "Identifiants invalides"

        if not user.is_active:
            return None, False, "Compte désactivé"

        if not user.check_password(password):
            AuthService._log_failed_attempt(username_or_email, ip_address,
                                            'invalid_password', user.user_id)
            AuthService._check_multiple_failed_attempts(user.user_id, ip_address)
            return None, False, "Identifiants invalides"

        # 2FA systématique : générer et envoyer un code
        two_fa_code = TwoFactorCode.create_for_user(user.user_id)
        AuthService._send_2fa_code(user, two_fa_code.code)

        AuthService._log_audit(user.user_id, 'login_2fa_required', 'user_account', user.user_id)

        return user, True, None

    @staticmethod
    def verify_2fa(user_id, code):
        """
        Vérifie le code 2FA.
        Retourne (user, error_message). La session est créée par la couche routes.
        """
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

        user = UserAccount.query.get(user_id)
        if user is None:
            # Compte supprimé entre-temps : la session 2FA n'a plus d'objet.
            return None, "Utilisateur introuvable"
        user.last_login = datetime.utcnow()
        db.session.commit()

        AuthService._log_audit(user_id, 'login_2fa_success', 'user_account', user_id)

        return user, None

    @staticmethod
    def request_password_reset(email):
        """Crée une demande de réinitialisation de mot de passe."""
        user = UserRepository.get_by_email(email)

        if not user:
            # Ne pas révéler si l'email existe (anti-énumération)
            return True, "Si cet email existe, vous recevrez un lien de réinitialisation"

        reset_token = PasswordResetToken.create_for_user(user.user_id)
        AuthService._send_reset_email(user, reset_token.token)
        AuthService._log_audit(user.user_id, 'password_reset_requested', 'user_account', user.user_id)

        return True, "Si cet email existe, vous recevrez un lien de réinitialisation"

    @staticmethod
    def reset_password(token, new_password):
        """Réinitialise le mot de passe avec un token."""
        reset_token = PasswordResetToken.query.filter_by(token=token).first()

        if not reset_token or not reset_token.is_valid():
            return False, "Token invalide ou expiré"

        user = reset_token.user
        user.set_password(new_password)
        reset_token.used = True
        db.session.commit()

        AuthService._log_audit(user.user_id, 'password_reset_completed', 'user_account', user.user_id)

        return True, "Mot de passe réinitialisé avec succès"

    @staticmethod
    def enable_2fa(user_id):
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"

        if user.two_fa_enabled:
            return False, "2FA déjà activé"

        two_fa_code = TwoFactorCode.create_for_user(user_id)
        AuthService._send_2fa_code(user, two_fa_code.code)

        return True, "Code de vérification envoyé"

    @staticmethod
    def confirm_enable_2fa(user_id, code):
        two_fa = TwoFactorCode.query.filter_by(
            user_id=user_id,
            verified=False
        ).order_by(TwoFactorCode.created_at.desc()).first()

        if not two_fa or not two_fa.verify_code(code):
            return False, "Code invalide"

        user = UserAccount.query.get(user_id)
        if user is None:
            return False, "Utilisateur introuvable"
        user.two_fa_enabled = True
        db.session.commit()

        AuthService._log_audit(user_id, '2fa_enabled', 'user_account', user_id)

        return True, "2FA activé avec succès"

    @staticmethod
    def disable_2fa(user_id):
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"

        user.two_fa_enabled = False
        db.session.commit()

        AuthService._log_audit(user_id, '2fa_disabled', 'user_account', user_id)

        return True, "2FA désactivé"

    # Méthodes privées

    @staticmethod
    def _send_2fa_code(user, code):
        from app.services.email_service import EmailService
        EmailService.send_2fa_code(user.email, code)

    @staticmethod
    def _send_reset_email(user, token):
        from app.services.email_service import EmailService
        reset_url = f"{current_app.config.get('FRONTEND_URL')}/reset-password?token={token}"
        EmailService.send_password_reset(user.email, reset_url)

    @staticmethod
    def _log_failed_attempt(username, ip_address, reason, user_id=None):
        """
        Enregistre une tentative de connexion échouée.

        `user_id` est renseigné quand le compte existe (mot de passe invalide) :
        sans lui, `_check_multiple_failed_attempts()` ne retrouve JAMAIS ses
        propres lignes (filtre `user_id == …`) et l'alerte de sécurité n'était
        jamais créée. Reste `None` pour un utilisateur inconnu (pas d'auteur
        attribuable, anti-énumération).
        """
        audit_service.log(
            'login_failed',
            'authentication',
            details={
                'username': username,
                'ip_address': ip_address,
                'reason': reason,
                'timestamp': datetime.utcnow().isoformat()
            },
            user_id=user_id,
        )

    @staticmethod
    def _check_multiple_failed_attempts(user_id, ip_address):
        """Détecte les tentatives multiples et crée une alerte."""
        fifteen_min_ago = datetime.utcnow() - timedelta(minutes=15)

        failed_attempts = AuditLog.query.filter(
            AuditLog.action == 'login_failed',
            AuditLog.user_id == user_id,
            AuditLog.created_at >= fifteen_min_ago
        ).count()

        if failed_attempts >= 5:
            alert = SecurityAlert(
                user_id=user_id,
                alert_type='multiple_login_attempts',
                severity='high',
                message=f"Détection de {failed_attempts} tentatives de connexion échouées",
                details={
                    'ip_address': ip_address,
                    'attempts': failed_attempts,
                    'time_window': '15 minutes'
                }
            )
            db.session.add(alert)
            db.session.commit()

    @staticmethod
    def _log_audit(user_id, action, object_type, object_id):
        """Enregistre une action dans le journal d'audit (service partagé)."""
        audit_service.log(action, object_type, object_id=object_id, user_id=user_id)
