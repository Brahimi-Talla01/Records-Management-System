from sqlalchemy import func

from app.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.role import Role
from app.models.tag import Tag
from app.models.user import UserAccount
from app.scope import is_super_admin
from app.services import audit_service
from extensions import db


def _require_name(value, code):
    name = (value or '').strip()
    if not name:
        raise ValidationError("Le nom est requis.", code=code)
    return name


class DepartmentService:

    @staticmethod
    def list_departments(actor, params=None):
        params = params or {}
        query = Department.query
        if is_super_admin(actor):
            if params.get('campus_id'):
                query = query.filter(Department.campus_id == int(params['campus_id']))
        else:
            if actor.campus_id is None:
                raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                            code='no_campus_scope')
            query = query.filter(Department.campus_id == actor.campus_id)
        return query.order_by(Department.name).all()

    @staticmethod
    def _campus_id(actor, data):
        if is_super_admin(actor) and data.get('campus_id'):
            return int(data['campus_id'])
        if actor.campus_id is None:
            raise ValidationError("campus_id requis.", code='missing_campus')
        return actor.campus_id

    @staticmethod
    def create_department(actor, data):
        name = _require_name(data.get('name'), 'missing_department_name')
        code = (data.get('code') or '').strip().upper()
        if not code:
            raise ValidationError("Le code est requis.", code='missing_department_code')
        campus_id = DepartmentService._campus_id(actor, data)
        duplicate = Department.query.filter(
            Department.campus_id == campus_id,
            func.lower(Department.code) == code.lower()).first()
        if duplicate is not None:
            raise ConflictError("Ce code de département existe déjà sur ce campus.",
                                code='department_code_exists')
        department = Department(name=name, code=code,
                                description=data.get('description'),
                                campus_id=campus_id)
        db.session.add(department)
        db.session.commit()
        audit_service.log('department_created', 'department',
                          object_id=department.department_id,
                          details={'code': code}, user_id=actor.user_id)
        return department

    @staticmethod
    def get_department(actor, department_id):
        department = Department.query.get(department_id)
        if department is None:
            raise NotFoundError("Département introuvable.", code='department_not_found')
        if not is_super_admin(actor) and department.campus_id != actor.campus_id:
            raise PermissionDeniedError("Accès inter-campus interdit.",
                                        code='cross_campus_access')
        return department

    @staticmethod
    def update_department(actor, department_id, data):
        department = DepartmentService.get_department(actor, department_id)
        if 'name' in data:
            department.name = _require_name(data['name'], 'missing_department_name')
        if 'description' in data:
            department.description = data['description']
        db.session.commit()
        audit_service.log('department_updated', 'department',
                          object_id=department.department_id,
                          details={'fields': list(data.keys())}, user_id=actor.user_id)
        return department

    @staticmethod
    def delete_department(actor, department_id):
        department = DepartmentService.get_department(actor, department_id)
        users = UserAccount.query.filter_by(department_id=department.department_id).count()
        documents = Document.query.filter_by(department_id=department.department_id).count()
        if users or documents:
            raise ConflictError("Département non vide : réaffectez son contenu.",
                                code='department_not_empty',
                                details={'users': users, 'documents': documents})
        db.session.delete(department)
        db.session.commit()
        audit_service.log('department_deleted', 'department', object_id=department_id,
                          user_id=actor.user_id)
        return True


class DocTypeService:

    @staticmethod
    def list_doc_types():
        return DocType.query.order_by(DocType.name).all()

    @staticmethod
    def create_doc_type(actor, data):
        name = _require_name(data.get('name'), 'missing_doc_type_name')
        if DocType.query.filter(func.lower(DocType.name) == name.lower()).first():
            raise ConflictError("Ce type existe déjà.", code='doc_type_exists')
        retention = data.get('default_retention_days')
        doc_type = DocType(name=name, description=data.get('description'),
                           default_retention_days=int(retention) if retention else None)
        db.session.add(doc_type)
        db.session.commit()
        audit_service.log('doc_type_created', 'doc_type',
                          object_id=doc_type.doc_type_id,
                          details={'name': name}, user_id=actor.user_id)
        return doc_type

    @staticmethod
    def get_doc_type(doc_type_id):
        doc_type = DocType.query.get(doc_type_id)
        if doc_type is None:
            raise NotFoundError("Type introuvable.", code='doc_type_not_found')
        return doc_type

    @staticmethod
    def update_doc_type(actor, doc_type_id, data):
        doc_type = DocTypeService.get_doc_type(doc_type_id)
        if 'name' in data:
            doc_type.name = _require_name(data['name'], 'missing_doc_type_name')
        if 'description' in data:
            doc_type.description = data['description']
        if 'default_retention_days' in data:
            value = data['default_retention_days']
            doc_type.default_retention_days = int(value) if value else None
        db.session.commit()
        audit_service.log('doc_type_updated', 'doc_type', object_id=doc_type.doc_type_id,
                          details={'fields': list(data.keys())}, user_id=actor.user_id)
        return doc_type

    @staticmethod
    def delete_doc_type(actor, doc_type_id):
        doc_type = DocTypeService.get_doc_type(doc_type_id)
        documents = Document.query.filter_by(doc_type_id=doc_type.doc_type_id).count()
        if documents:
            raise ConflictError("Des documents utilisent ce type.",
                                code='doc_type_in_use', details={'documents': documents})
        db.session.delete(doc_type)
        db.session.commit()
        audit_service.log('doc_type_deleted', 'doc_type', object_id=doc_type_id,
                          user_id=actor.user_id)
        return True


class TagService:

    @staticmethod
    def list_tags():
        return Tag.query.order_by(Tag.name).all()

    @staticmethod
    def create_tag(actor, data):
        name = _require_name(data.get('name'), 'missing_tag_name')
        if Tag.query.filter(func.lower(Tag.name) == name.lower()).first():
            raise ConflictError("Ce tag existe déjà.", code='tag_exists')
        tag = Tag(name=name)
        db.session.add(tag)
        db.session.commit()
        audit_service.log('tag_created', 'tag', object_id=tag.tag_id,
                          details={'name': name}, user_id=actor.user_id)
        return tag

    @staticmethod
    def delete_tag(actor, tag_id):
        tag = Tag.query.get(tag_id)
        if tag is None:
            raise NotFoundError("Tag introuvable.", code='tag_not_found')
        db.session.delete(tag)
        db.session.commit()
        audit_service.log('tag_deleted', 'tag', object_id=tag_id, user_id=actor.user_id)
        return True


class RoleService:

    @staticmethod
    def list_roles():
        return Role.query.order_by(Role.name).all()

    @staticmethod
    def get_role(role_id):
        role = Role.query.get(role_id)
        if role is None:
            raise NotFoundError("Rôle introuvable.", code='role_not_found')
        return role

    @staticmethod
    def create_role(actor, data):
        name = _require_name(data.get('name'), 'missing_role_name')
        if Role.query.filter(func.lower(Role.name) == name.lower()).first():
            raise ConflictError("Ce rôle existe déjà.", code='role_exists')
        role = Role(name=name, description=data.get('description'))
        db.session.add(role)
        db.session.commit()
        audit_service.log('role_created', 'role', object_id=role.role_id,
                          details={'name': name}, user_id=actor.user_id)
        return role

    @staticmethod
    def update_role(actor, role_id, data):
        role = RoleService.get_role(role_id)
        if 'name' in data:
            role.name = _require_name(data['name'], 'missing_role_name')
        if 'description' in data:
            role.description = data['description']
        db.session.commit()
        audit_service.log('role_updated', 'role', object_id=role.role_id,
                          details={'fields': list(data.keys())}, user_id=actor.user_id)
        return role

    @staticmethod
    def delete_role(actor, role_id):
        role = RoleService.get_role(role_id)
        users = UserAccount.query.filter_by(role_id=role.role_id).count()
        if users:
            raise ConflictError("Des comptes utilisent ce rôle.",
                                code='role_in_use', details={'users': users})
        db.session.delete(role)
        db.session.commit()
        audit_service.log('role_deleted', 'role', object_id=role_id,
                          user_id=actor.user_id)
        return True
