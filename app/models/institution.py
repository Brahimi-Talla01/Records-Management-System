from datetime import datetime, timezone

from extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class Institution(db.Model):
    __tablename__ = 'institution'

    institution_id = db.Column(db.SmallInteger, primary_key=True)
    name = db.Column(db.String(200), nullable=False, default='Établissement')
    short_name = db.Column(db.String(50))
    slogan = db.Column(db.String(300))
    address = db.Column(db.String(500))
    website = db.Column(db.String(200))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(50))
    logo_url = db.Column(db.String(500))
    locale = db.Column(db.String(10), nullable=False, default='fr')
    timezone = db.Column(db.String(60), nullable=False, default='Africa/Douala')
    created_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    @classmethod
    def get(cls):
        return cls.query.first()

    def to_dict(self):
        return {
            'institution_id': self.institution_id,
            'name': self.name,
            'short_name': self.short_name,
            'slogan': self.slogan,
            'address': self.address,
            'website': self.website,
            'email': self.email,
            'phone': self.phone,
            'logo_url': self.logo_url,
            'locale': self.locale,
            'timezone': self.timezone,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
