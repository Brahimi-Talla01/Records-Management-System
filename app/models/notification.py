from extensions import db
from datetime import datetime

class Notification(db.Model):
    __tablename__ = 'notification'
    
    notification_id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))
    title = db.Column(db.String(100))
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    action_url = db.Column(db.String(500))
    
    # Foreign key
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=False)
    
    # Relation
    user = db.relationship('UserAccount', back_populates='notifications')
    
    def to_dict(self):
        return {
            'notification_id': self.notification_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'action_url': self.action_url
        }