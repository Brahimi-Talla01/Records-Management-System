from extensions import db
from datetime import datetime

class UserDocumentRight(db.Model):
    __tablename__ = 'user_document_right'
    
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id', ondelete='CASCADE'), primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('document.document_id', ondelete='CASCADE'), primary_key=True)
    can_view = db.Column(db.Boolean, nullable=False, default=False)
    can_download = db.Column(db.Boolean, nullable=False, default=False)
    can_edit = db.Column(db.Boolean, nullable=False, default=False)
    can_delete = db.Column(db.Boolean, nullable=False, default=False)
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    granted_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id'))
    
    # Relations
    user = db.relationship('UserAccount', foreign_keys=[user_id], backref='document_rights')
    document = db.relationship('Document', backref='user_rights')
    granter = db.relationship('UserAccount', foreign_keys=[granted_by])