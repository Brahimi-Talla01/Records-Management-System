from extensions import db
from datetime import datetime, timedelta
import secrets
import random

class TwoFactorCode(db.Model):
    __tablename__ = 'two_factor_code'
    
    code_id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    verified = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)
    
    user = db.relationship('UserAccount', backref='two_factor_codes')
    
    @staticmethod
    def generate_code():
        """Génère un code à 6 chiffres"""
        return str(random.randint(100000, 999999))
    
    def is_valid(self):
        """Vérifie si le code est valide"""
        return (not self.verified and 
                datetime.utcnow() < self.expires_at and 
                self.attempts < 3)
    
    def verify_code(self, code):
        """Vérifie le code fourni"""
        self.attempts += 1
        if self.code == code and self.is_valid():
            self.verified = True
            db.session.commit()
            return True
        db.session.commit()
        return False
    
    @classmethod
    def create_for_user(cls, user_id):
        """Crée un nouveau code 2FA"""
        code = cls(
            code=cls.generate_code(),
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        db.session.add(code)
        db.session.commit()
        return code