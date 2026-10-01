from extensions import db
from datetime import datetime

class RetentionReport(db.Model):
    """Rapport d'exécution du job de rétention (plan 07 — P5)."""

    __tablename__ = 'retention_report'

    report_id = db.Column(db.Integer, primary_key=True)
    ran_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                       index=True)
    dry_run = db.Column(db.Boolean, nullable=False, default=False)
    warnings_sent = db.Column(db.Integer, nullable=False, default=0)
    archived = db.Column(db.Integer, nullable=False, default=0)
    purged = db.Column(db.Integer, nullable=False, default=0)
    triggered_by = db.Column(
        db.Integer, db.ForeignKey('user_account.user_id', ondelete='SET NULL'))
    details = db.Column(db.JSON)

    user = db.relationship('UserAccount', backref='retention_reports')

    def to_dict(self):
        return {
            'report_id': self.report_id,
            'ran_at': self.ran_at.isoformat() if self.ran_at else None,
            'dry_run': self.dry_run,
            'warnings_sent': self.warnings_sent,
            'archived': self.archived,
            'purged': self.purged,
            'triggered_by': self.triggered_by,
            'details': self.details or {},
        }
