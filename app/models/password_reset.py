from extensions import db
from datetime import datetime, timedelta
import secrets

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_token'
    
    token_id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    
    user = db.relationship('UserAccount', backref='reset_tokens')
    
    @staticmethod
    def generate_token():
        """Génère un token sécurisé"""
        return secrets.token_urlsafe(32)
    
    def is_valid(self):
        """Vérifie si le token est valide"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    @classmethod
    def create_for_user(cls, user_id):
        """Crée un nouveau token pour un utilisateur"""
        token = cls(
            token=cls.generate_token(),
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db.session.add(token)
        db.session.commit()
        return token