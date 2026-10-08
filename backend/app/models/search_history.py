from extensions import db
from datetime import datetime

class SearchHistory(db.Model):
    __tablename__ = 'search_history'

    __table_args__ = (
        db.Index('ix_search_history_user_searched_at', 'user_id', 'searched_at'),
    )

    search_id = db.Column(db.Integer, primary_key=True)
    # Colonne SQL `query` : l'attribut est nommé `search_query` pour ne pas
    # masquer `Model.query` (Flask-SQLAlchemy).
    search_query = db.Column('query', db.Text)
    filters = db.Column(db.JSON)  # PostgreSQL supporte JSON
    results_count = db.Column(db.Integer)
    searched_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Foreign key
    user_id = db.Column(db.Integer, db.ForeignKey('user_account.user_id'), nullable=False, index=True)

    # Relation
    user = db.relationship('UserAccount', back_populates='search_history')

    def to_dict(self):
        return {
            'search_id': self.search_id,
            'query': self.search_query,
            'filters': self.filters,
            'results_count': self.results_count,
            'searched_at': self.searched_at.isoformat() if self.searched_at else None
        }
