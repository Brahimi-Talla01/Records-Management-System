from extensions import db
from datetime import datetime

class SecurityAlert(db.Model):
    __tablename__ = 'security_alert'
    
    alert_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # 'multiple_login_attempts', 'suspicious_location', etc.
    severity = db.Column(db.String(20), default='medium')  # 'low', 'medium', 'high'
    message = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON) 
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id'))
    
    user = db.relationship('UserAccount', foreign_keys=[user_id], backref='security_alerts')
    resolver = db.relationship('UserAccount', foreign_keys=[resolved_by])
    
    def to_dict(self):
        return {
            'alert_id': self.alert_id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'message': self.message,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }