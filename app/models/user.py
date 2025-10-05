from extensions import db, bcrypt
from datetime import datetime
import json

class UserAccount(db.Model):
    __tablename__ = 'user_account'
    
    user_id = db.Column(db.Integer, primary_key=True)
    matricule = db.Column(db.String(20), nullable=False, unique=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(150), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(150))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime)
    two_fa_enabled = db.Column(db.Boolean, default=False, nullable=False)
    preferences = db.Column(db.JSON)  # PostgreSQL supporte JSON
    
    # Clés étrangères
    department_id = db.Column(db.Integer, db.ForeignKey('department.department_id'))
    role_id = db.Column(db.Integer, db.ForeignKey('role.role_id'), nullable=False)
    
    # Relations
    role = db.relationship('Role', back_populates='users')
    department = db.relationship('Department', back_populates='users')
    notifications = db.relationship('Notification', back_populates='user', lazy='dynamic')
    search_history = db.relationship('SearchHistory', back_populates='user', lazy='dynamic')
    
    def set_password(self, password):
        """Hash le mot de passe"""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Vérifie le mot de passe"""
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def get_preferences(self):
        """Retourne les préférences"""
        return self.preferences if self.preferences else {}
    
    def set_preferences(self, prefs_dict):
        """Sauvegarde les préférences"""
        self.preferences = prefs_dict
    
    def to_dict(self, include_sensitive=False):
        data = {
            'user_id': self.user_id,
            'matricule': self.matricule,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'two_fa_enabled': self.two_fa_enabled,
            'role': self.role.to_dict() if self.role else None,
            'department': self.department.to_dict() if self.department else None
        }
        if include_sensitive:
            data['preferences'] = self.get_preferences()
        return data