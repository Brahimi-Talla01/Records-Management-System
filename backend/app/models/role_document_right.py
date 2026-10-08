from extensions import db
from datetime import datetime

class RoleDocumentRight(db.Model):
    __tablename__ = 'role_document_right'
    
    role_id = db.Column(db.Integer, db.ForeignKey('role.role_id', ondelete='CASCADE'), primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('document.document_id', ondelete='CASCADE'), primary_key=True)
    can_view = db.Column(db.Boolean, nullable=False, default=False)
    can_download = db.Column(db.Boolean, nullable=False, default=False)
    can_edit = db.Column(db.Boolean, nullable=False, default=False)
    can_delete = db.Column(db.Boolean, nullable=False, default=False)
    granted_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id'))
    granted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    role = db.relationship('Role', backref='document_rights')
    document = db.relationship('Document', backref='role_rights')
    granter = db.relationship('UserAccount')