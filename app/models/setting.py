from datetime import datetime, timezone

from extensions import db


def _utcnow():
    return datetime.now(timezone.utc)


class Setting(db.Model):
    __tablename__ = 'setting'

    __table_args__ = (
        db.CheckConstraint("scope IN ('global', 'campus')", name='ck_setting_scope'),
        db.Index('ix_setting_key', 'key'),
        db.Index(
            'uq_setting_global', 'key', unique=True,
            postgresql_where=db.text("scope = 'global'"),
            sqlite_where=db.text("scope = 'global'"),
        ),
        db.Index(
            'uq_setting_campus', 'key', 'campus_id', unique=True,
            postgresql_where=db.text("scope = 'campus'"),
            sqlite_where=db.text("scope = 'campus'"),
        ),
    )

    setting_id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    scope = db.Column(db.String(20), nullable=False, default='global')
    campus_id = db.Column(
        db.Integer,
        db.ForeignKey('campus.campus_id', ondelete='CASCADE'),
        nullable=True,
        index=True,
    )
    value = db.Column(db.JSON, nullable=False)
    updated_by = db.Column(
        db.Integer,
        db.ForeignKey('user_account.user_id', ondelete='SET NULL'),
        nullable=True,
    )
    updated_at = db.Column(db.DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    campus = db.relationship('Campus')
    updater = db.relationship('UserAccount', foreign_keys=[updated_by])

    def to_dict(self):
        return {
            'key': self.key,
            'scope': self.scope,
            'campus_id': self.campus_id,
            'value': self.value,
            'updated_by': self.updated_by,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
