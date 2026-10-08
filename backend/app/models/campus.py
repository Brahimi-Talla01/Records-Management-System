from datetime import datetime, timezone

from extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class Campus(db.Model):
    __tablename__ = 'campus'

    campus_id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False, unique=True)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(500))
    city = db.Column(db.String(120))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    departments = db.relationship('Department', back_populates='campus', lazy='dynamic')
    folders = db.relationship('Folder', back_populates='campus', lazy='dynamic')
    documents = db.relationship('Document', back_populates='campus', lazy='dynamic')
    users = db.relationship('UserAccount', back_populates='campus', lazy='dynamic')

    def stats(self):
        return {
            'departments': self.departments.count(),
            'documents': self.documents.count(),
            'users': self.users.count(),
        }

    def to_dict(self, include_stats=False):
        data = {
            'campus_id': self.campus_id,
            'code': self.code,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'phone': self.phone,
            'email': self.email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_stats:
            data['stats'] = self.stats()
        return data
