from datetime import datetime
from extensions import db

class Document(db.Model):
    __tablename__ = 'document'
    
    document_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default='active')
    confidentiality_level = db.Column(db.String(50), nullable=False, default='internal')
    retention_period = db.Column(db.Integer)
    is_encrypted = db.Column(db.Boolean, default=False)
    ocr_text = db.Column(db.Text)
    size_bytes = db.Column(db.BigInteger)

    # Clés Étrangères
    department_id = db.Column(
        db.Integer, 
        db.ForeignKey('department.department_id', ondelete='SET NULL'),
        nullable=True
    )
    
    doc_type_id = db.Column(
        db.Integer, 
        db.ForeignKey('doc_type.doc_type_id', ondelete='RESTRICT'), 
        nullable=False
    )
    
    folder_id = db.Column(
        db.Integer, 
        db.ForeignKey('folder.folder_id', ondelete='SET NULL'),
        nullable=True
    )

    # Relations - IMPORTANT: utilisez back_populates au lieu de backref
    department = db.relationship('Department', back_populates='documents')
    doc_type = db.relationship('DocType', back_populates='documents')
    folder = db.relationship('Folder', back_populates='documents')
    
    # Relation avec les versions
    versions = db.relationship('DocumentVersion', back_populates='document', 
                              cascade='all, delete-orphan', lazy='dynamic')
    
    # Relation avec les tags (many-to-many)
    tags = db.relationship('Tag', secondary='document_tag', 
                          back_populates='documents', lazy='dynamic')
    
    def to_dict(self, include_versions=False):
        """Sérialisation en dictionnaire pour les API."""
        data = {
            'document_id': self.document_id,
            'title': self.title,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status,
            'confidentiality_level': self.confidentiality_level,
            'department_id': self.department_id,
            'doc_type_id': self.doc_type_id,
            'folder_id': self.folder_id,
            'size_bytes': self.size_bytes,
            'is_encrypted': self.is_encrypted
        }
        
        if include_versions:
            data['versions'] = [v.to_dict() for v in self.versions.all()]
        
        return data