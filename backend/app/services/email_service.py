"""
Service d'envoi d'emails transactionnels (asynchrone via threads).

Mode dev (pas de MAIL_SERVER configuré) : le contenu de l'email est loggé
dans la console au lieu d'être envoyé — permet de tester login/2FA/reset
sans infrastructure SMTP.
"""

from flask import current_app
from flask_mail import Message
from extensions import mail
from threading import Thread


class EmailService:

    @staticmethod
    def _smtp_configured():
        return bool(current_app.config.get('MAIL_SERVER'))

    @staticmethod
    def send_async_email(app, msg):
        """Envoie un email de manière asynchrone."""
        with app.app_context():
            try:
                mail.send(msg)
                current_app.logger.info(f"Email envoyé à {msg.recipients[0]}")
            except Exception as e:
                current_app.logger.error(f"Erreur envoi email: {str(e)}")

    @staticmethod
    def send_email(to, subject, html_body):
        """Envoie un email, ou le log si SMTP non configuré (mode dev)."""
        if not to:
            current_app.logger.warning("send_email appelé sans destinataire")
            return

        if not EmailService._smtp_configured():
            # print() plutôt que logger : visible sous gunicorn en production
            # (le logger Flask n'émet que ERROR+ hors debug).
            print(
                "\n" + "=" * 60 +
                "\n[MODE DEV - EMAIL NON ENVOYÉ - SMTP NON CONFIGURÉ]" +
                f"\n  À      : {to}" +
                f"\n  Objet  : {subject}" +
                "\n" + html_body +
                "\n" + "=" * 60,
                flush=True,
            )
            return

        try:
            msg = Message(
                subject=subject,
                recipients=[to],
                html=html_body,
                sender=current_app.config['MAIL_USERNAME'],
            )
            Thread(
                target=EmailService.send_async_email,
                # current_app est un LocalProxy : _get_current_object() existe à
                # l'exécution mais pas dans le type « Flask » vu par pyright.
                args=(current_app._get_current_object(), msg),  # pyright: ignore[reportAttributeAccessIssue]
            ).start()
        except Exception as e:
            current_app.logger.error(f"Erreur lors de la création du message: {str(e)}")

    @staticmethod
    def send_2fa_code(email, code):
        """Envoie le code 2FA."""
        subject = "UniArchive - Code de vérification"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333;">Code de vérification UniArchive</h2>
                    <p style="color: #666;">Bonjour,</p>
                    <p style="color: #666;">Votre code de vérification à deux facteurs est :</p>
                    <div style="background-color: #007bff; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 5px; letter-spacing: 5px; margin: 20px 0;">
                        {code}
                    </div>
                    <p style="color: #666;">Ce code expire dans <strong>10 minutes</strong>.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Si vous n'avez pas demandé ce code, ignorez cet email ou contactez le support.
                    </p>
                </div>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)

    @staticmethod
    def send_password_reset(email, reset_url):
        """Envoie le lien de réinitialisation de mot de passe."""
        subject = "UniArchive - Réinitialisation de mot de passe"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
                    <p style="color: #666;">Bonjour,</p>
                    <p style="color: #666;">Vous avez demandé la réinitialisation de votre mot de passe.</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Réinitialiser mon mot de passe
                        </a>
                    </p>
                    <p style="color: #666;">Ou copiez ce lien dans votre navigateur :</p>
                    <p style="color: #007bff; font-size: 12px; word-break: break-all;">{reset_url}</p>
                    <p style="color: #666;">Ce lien expire dans <strong>1 heure</strong>.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                    </p>
                </div>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)

    @staticmethod
    def send_password_reset_notification(email, temporary_password):
        """
        Notifie un utilisateur que son mot de passe a été réinitialisé par un admin.
        """
        subject = "UniArchive - Votre mot de passe a été réinitialisé"
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
                    <h2 style="color: #333;">Mot de passe réinitialisé</h2>
                    <p style="color: #666;">Bonjour,</p>
                    <p style="color: #666;">Votre mot de passe a été réinitialisé par un administrateur.</p>
                    <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <p style="color: #666; margin: 0 0 10px 0;">Mot de passe temporaire :</p>
                        <p style="font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 0;">{temporary_password}</p>
                    </div>
                    <p style="color: #c0392b; font-weight: bold;">
                        ⚠️ Changez ce mot de passe dès votre prochaine connexion.
                    </p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement le support.
                    </p>
                </div>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)
