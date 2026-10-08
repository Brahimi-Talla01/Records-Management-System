from extensions import db

class DocType(db.Model):
    __tablename__ = 'doc_type'
    
    doc_type_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    description = db.Column(db.Text)
    default_retention_days = db.Column(db.Integer)
    
    # Relations
    documents = db.relationship('Document', back_populates='doc_type', lazy='dynamic')
    
    def to_dict(self):
        return {
            'doc_type_id': self.doc_type_id,
            'name': self.name,
            'description': self.description,
            'default_retention_days': self.default_retention_days
        }