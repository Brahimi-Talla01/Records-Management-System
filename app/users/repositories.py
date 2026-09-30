"""
Repository users : centralise les requêtes SQLAlchemy du domaine.
Les services appellent le repository ; les routes ne touchent jamais l'ORM.
"""

from sqlalchemy import or_, func

from app.models.user import UserAccount
from app.models.role import Role
from app.models.department import Department
from extensions import db


class UserRepository:

    @staticmethod
    def search(page=1, per_page=20, filters=None):
        """Liste paginée avec filtres (search, role_id, department_id, is_active)."""
        query = UserAccount.query
        filters = filters or {}

        if filters.get('search'):
            pattern = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    UserAccount.username.ilike(pattern),
                    UserAccount.email.ilike(pattern),
                    UserAccount.full_name.ilike(pattern),
                    UserAccount.matricule.ilike(pattern),
                )
            )
        if filters.get('role_id'):
            query = query.filter(UserAccount.role_id == filters['role_id'])
        if filters.get('department_id'):
            query = query.filter(UserAccount.department_id == filters['department_id'])
        if filters.get('is_active') is not None:
            query = query.filter(UserAccount.is_active == filters['is_active'])

        return query.order_by(UserAccount.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

    @staticmethod
    def get_by_id(user_id):
        return UserAccount.query.get(user_id)

    @staticmethod
    def get_by_username(username):
        return UserAccount.query.filter_by(username=username).first()

    @staticmethod
    def get_by_email(email):
        return UserAccount.query.filter_by(email=email).first()

    @staticmethod
    def get_by_matricule(matricule):
        return UserAccount.query.filter_by(matricule=matricule).first()

    @staticmethod
    def find_by_username_or_email(identifier):
        return UserAccount.query.filter(
            (UserAccount.username == identifier) | (UserAccount.email == identifier)
        ).first()

    @staticmethod
    def add(user):
        db.session.add(user)

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()

    @staticmethod
    def count_active(active=True):
        return UserAccount.query.filter_by(is_active=active).count()

    @staticmethod
    def count_all():
        return UserAccount.query.count()

    @staticmethod
    def count_by_role():
        return (
            db.session.query(Role.name, func.count(UserAccount.user_id))
            .join(UserAccount)
            .group_by(Role.name)
            .all()
        )

    @staticmethod
    def count_by_department():
        return (
            db.session.query(Department.name, func.count(UserAccount.user_id))
            .join(UserAccount)
            .group_by(Department.name)
            .all()
        )

    @staticmethod
    def all_roles():
        return Role.query.all()

    @staticmethod
    def all_departments():
        return Department.query.all()
