from extensions import db
from datetime import datetime

class Role(db.Model):
    __tablename__ = 'role'
    
    role_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(200))
    
    # Relations
    users = db.relationship('UserAccount', back_populates='role', lazy='dynamic')
    
    def to_dict(self):
        return {
            'role_id': self.role_id,
            'name': self.name,
            'description': self.description
        }