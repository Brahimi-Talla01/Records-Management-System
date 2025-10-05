from extensions import db
from datetime import datetime

class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    
    audit_id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(100), nullable=False)
    object_type = db.Column(db.String(100), nullable=False)
    object_id = db.Column(db.Integer)
    details = db.Column(db.JSON)  # PostgreSQL supporte JSON nativement
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign keys - NULLABLE pour éviter les problèmes de contraintes
    document_id = db.Column(db.Integer, db.ForeignKey('document.document_id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=True)
    
    # Relations - utilisez lazy='dynamic' pour éviter le chargement automatique
    document = db.relationship('Document', backref=db.backref('audit_logs', lazy='dynamic'))
    user = db.relationship('UserAccount', backref=db.backref('audit_logs', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'audit_id': self.audit_id,
            'action': self.action,
            'object_type': self.object_type,
            'object_id': self.object_id,
            'details': self.details,  # JSON est déjà un dict en PostgreSQL
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': {
                'user_id': self.user.user_id,
                'username': self.user.username,
                'full_name': self.user.full_name
            } if self.user else None
        }
    
    @classmethod
    def log_action(cls, user_id, action, object_type, object_id=None, details=None):
        """Enregistre une action dans le journal d'audit"""
        audit = cls(
            user_id=user_id,
            action=action,
            object_type=object_type,
            object_id=object_id,
            details=details  # Pas besoin de json.dumps avec PostgreSQL
        )
        db.session.add(audit)
        db.session.commit()
        return audit