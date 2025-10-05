from flask import current_app, render_template_string
from flask_mail import Message
from extensions import mail
from threading import Thread

class EmailService:
    
    @staticmethod
    def send_async_email(app, msg):
        """Envoie un email de manière asynchrone"""
        with app.app_context():
            try:
                mail.send(msg)
            except Exception as e:
                current_app.logger.error(f"Erreur envoi email: {str(e)}")
    
    @staticmethod
    def send_email(to, subject, html_body):
        """Envoie un email"""
        msg = Message(
            subject=subject,
            recipients=[to],
            html=html_body,
            sender=current_app.config['MAIL_USERNAME']
        )
        
        # Envoyer de manière asynchrone
        Thread(
            target=EmailService.send_async_email,
            args=(current_app._get_current_object(), msg)
        ).start()
    
    @staticmethod
    def send_2fa_code(email, code):
        """Envoie le code 2FA"""
        subject = "UniArchive - Code de vérification"
        html_body = f"""
        <html>
            <body>
                <h2>Code de vérification</h2>
                <p>Votre code de vérification à deux facteurs est:</p>
                <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px;">{code}</h1>
                <p>Ce code expire dans 10 minutes.</p>
                <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)
    
    @staticmethod
    def send_password_reset(email, reset_url):
        """Envoie le lien de réinitialisation de mot de passe"""
        subject = "UniArchive - Réinitialisation de mot de passe"
        html_body = f"""
        <html>
            <body>
                <h2>Réinitialisation de mot de passe</h2>
                <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                <p>Cliquez sur le lien ci-dessous pour continuer:</p>
                <p><a href="{reset_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
                <p>Ce lien expire dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)
    
    @staticmethod
    def send_security_alert(email, alert_message):
        """Envoie une alerte de sécurité"""
        subject = "UniArchive - Alerte de sécurité"
        html_body = f"""
        <html>
            <body>
                <h2 style="color: #dc3545;">⚠️ Alerte de Sécurité</h2>
                <p>{alert_message}</p>
                <p>Si ce n'est pas vous, veuillez immédiatement:</p>
                <ul>
                    <li>Changer votre mot de passe</li>
                    <li>Activer l'authentification à deux facteurs</li>
                    <li>Contacter le support technique</li>
                </ul>
            </body>
        </html>
        """
        EmailService.send_email(email, subject, html_body)