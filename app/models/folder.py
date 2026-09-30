from extensions import db
from datetime import datetime

class Folder(db.Model):
    __tablename__ = 'folder'
    
    folder_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    parent_folder_id = db.Column(db.Integer, db.ForeignKey('folder.folder_id'), nullable=True)
    
    # Relations
    # Self-referential relationship pour la hiérarchie
    parent = db.relationship('Folder', remote_side=[folder_id], backref='subfolders')
    
    # Relation avec les documents
    documents = db.relationship('Document', back_populates='folder', lazy='dynamic')
    
    # Relation avec le département
    department = db.relationship('Department', back_populates='folder', uselist=False)
    
    def to_dict(self, include_children=False):
        data = {
            'folder_id': self.folder_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'parent_folder_id': self.parent_folder_id
        }
        
        if include_children:
            # `subfolders` est créé par le backref du relationship `parent` :
            # pyright ne le voit pas à la déclaration (attribut dynamique SQLAlchemy).
            data['subfolders'] = [f.to_dict() for f in self.subfolders]  # pyright: ignore[reportAttributeAccessIssue]
        
        return data