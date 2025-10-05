from extensions import db
from datetime import datetime

class UserFolderRight(db.Model):
    __tablename__ = 'user_folder_right'
    
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id', ondelete='CASCADE'), primary_key=True)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.folder_id', ondelete='CASCADE'), primary_key=True)
    can_view = db.Column(db.Boolean, nullable=False, default=False)
    can_download = db.Column(db.Boolean, nullable=False, default=False)
    can_edit = db.Column(db.Boolean, nullable=False, default=False)
    can_delete = db.Column(db.Boolean, nullable=False, default=False)
    granted_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id'))
    granted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relations
    user = db.relationship('UserAccount', foreign_keys=[user_id], backref='folder_rights')
    folder = db.relationship('Folder', backref='user_rights')
    granter = db.relationship('UserAccount', foreign_keys=[granted_by])