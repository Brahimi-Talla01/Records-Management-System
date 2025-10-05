from extensions import db
from datetime import datetime

class DocumentVersion(db.Model):
    __tablename__ = 'document_version'
    
    version_id = db.Column(db.Integer, primary_key=True)
    version_number = db.Column(db.Integer, nullable=False)
    storage_url = db.Column(db.String(500), nullable=False)
    mime_type = db.Column(db.String(100))
    checksum = db.Column(db.String(100))
    uploaded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    change_note = db.Column(db.Text)
    
    # Foreign keys
    document_id = db.Column(db.Integer, db.ForeignKey('document.document_id', ondelete='CASCADE'), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user_account.user_id', ondelete='SET NULL'))
    
    # Relations
    document = db.relationship('Document', back_populates='versions')
    uploader = db.relationship('UserAccount', backref='uploaded_versions')
    
    def to_dict(self):
        return {
            'version_id': self.version_id,
            'version_number': self.version_number,
            'storage_url': self.storage_url,
            'mime_type': self.mime_type,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'change_note': self.change_note,
            'uploaded_by': self.uploaded_by
        }