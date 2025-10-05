from extensions import db

class Tag(db.Model):
    __tablename__ = 'tag'
    
    tag_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    
    # Relation many-to-many avec Document
    documents = db.relationship('Document', secondary='document_tag', 
                               back_populates='tags', lazy='dynamic')
    
    def to_dict(self):
        return {
            'tag_id': self.tag_id,
            'name': self.name
        }