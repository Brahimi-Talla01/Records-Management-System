from extensions import db
from datetime import datetime

class RoleFolderRight(db.Model):
    __tablename__ = 'role_folder_right'
    
    role_id = db.Column(db.Integer, db.ForeignKey('role.role_id', ondelete='CASCADE'), primary_key=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.folder_id', ondelete='CASCADE'), primary_key=True)
    can_view = db.Column(db.Boolean, nullable=False, default=False)
    can_download = db.Column(db.Boolean, nullable=False, default=False)
    can_edit = db.Column(db.Boolean, nullable=False, default=False)
    can_delete = db.Column(db.Boolean, nullable=False, default=False)
    granted_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id'))
    granted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relations
    role = db.relationship('Role', backref='folder_rights')
    folder = db.relationship('Folder', backref='role_rights')
    granter = db.relationship('UserAccount')