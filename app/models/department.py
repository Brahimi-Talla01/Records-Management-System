from extensions import db

class Department(db.Model):
    __tablename__ = 'department'
    
    department_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    description = db.Column(db.String(500))
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.folder_id'), nullable=True)
    
    # Relations
    users = db.relationship('UserAccount', back_populates='department', lazy='dynamic')
    documents = db.relationship('Document', back_populates='department', lazy='dynamic')
    folder = db.relationship('Folder', back_populates='department')
    
    def to_dict(self):
        return {
            'department_id': self.department_id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'folder_id': self.folder_id
        }