from extensions import db

class Department(db.Model):
    __tablename__ = 'department'

    __table_args__ = (
        db.Index('uq_department_campus_code', 'campus_id', 'code', unique=True),
    )

    department_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(500))
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.folder_id'), nullable=True)
    campus_id = db.Column(
        db.Integer,
        db.ForeignKey('campus.campus_id', ondelete='RESTRICT'),
        nullable=False,
        index=True,
    )

    # Relations
    users = db.relationship('UserAccount', back_populates='department', lazy='dynamic')
    documents = db.relationship('Document', back_populates='department', lazy='dynamic')
    folder = db.relationship('Folder', back_populates='department')
    campus = db.relationship('Campus', back_populates='departments')

    def to_dict(self):
        return {
            'department_id': self.department_id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'folder_id': self.folder_id,
            'campus_id': self.campus_id
        }