"""
Décorateurs transverses réutilisables.
"""

from functools import wraps

from extensions import db


def transactional(fn):
    """
    Encapsule la route dans une transaction : commit si succès, rollback si exception.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            result = fn(*args, **kwargs)
            db.session.commit()
            return result
        except Exception:
            db.session.rollback()
            raise
    return wrapper
