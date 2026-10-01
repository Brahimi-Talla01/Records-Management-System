from typing import Any

from flask import g

from app.models.folder import Folder
from app.models.role_document_right import RoleDocumentRight
from app.models.role_folder_right import RoleFolderRight
from app.models.user_document_right import UserDocumentRight
from app.models.user_folder_right import UserFolderRight
from app.scope import is_super_admin
from extensions import db

ACTIONS = ('view', 'download', 'edit', 'delete')


def _cache():
    cache = getattr(g, '_permission_cache', None)
    if cache is None:
        cache = g._permission_cache = {}
    return cache


def _cached(key, loader):
    cache = _cache()
    if key not in cache:
        cache[key] = loader()
    return cache[key]


def purge_permission_cache():
    if hasattr(g, '_permission_cache'):
        g._permission_cache.clear()


def _folder_chain(folder_id):
    chain = []
    seen = set()
    folder = Folder.query.get(folder_id) if folder_id else None
    while folder is not None and folder.folder_id not in seen:
        seen.add(folder.folder_id)
        chain.append(folder.folder_id)
        folder = folder.parent
    return chain


def _set_rights(row, rights: dict):
    for action in ACTIONS:
        if action in rights:
            setattr(row, f'can_{action}', bool(rights[action]))


class PermissionService:

    @staticmethod
    def _campus_allowed(user, document) -> bool:
        if is_super_admin(user):
            return True
        return document.campus_id == user.campus_id

    @staticmethod
    def _user_document_right(user, document):
        return _cached(('udr', user.user_id, document.document_id), lambda: (
            UserDocumentRight.query.filter_by(
                user_id=user.user_id, document_id=document.document_id).first()))

    @staticmethod
    def _role_document_right(user, document):
        if user.role_id is None:
            return None
        return _cached(('rdr', user.role_id, document.document_id), lambda: (
            RoleDocumentRight.query.filter_by(
                role_id=user.role_id, document_id=document.document_id).first()))

    @staticmethod
    def _user_folder_right(user, folder_id):
        if folder_id is None:
            return None

        def load():
            for fid in _folder_chain(folder_id):
                row = UserFolderRight.query.filter_by(
                    user_id=user.user_id, folder_id=fid).first()
                if row is not None:
                    return row
            return None

        return _cached(('ufr', user.user_id, folder_id), load)

    @staticmethod
    def _role_folder_right(user, folder_id):
        if folder_id is None or user.role_id is None:
            return None

        def load():
            for fid in _folder_chain(folder_id):
                row = RoleFolderRight.query.filter_by(
                    role_id=user.role_id, folder_id=fid).first()
                if row is not None:
                    return row
            return None

        return _cached(('rfr', user.role_id, folder_id), load)

    @staticmethod
    def explain(user, document, action: str = 'view') -> dict:
        if action not in ACTIONS:
            return {'allowed': False, 'rule': 'unknown_action'}
        if not PermissionService._campus_allowed(user, document):
            return {'allowed': False, 'rule': 'campus'}

        for right, rule in (
            (PermissionService._user_document_right(user, document), 'explicit_user'),
            (PermissionService._user_folder_right(user, document.folder_id), 'folder_user'),
            (PermissionService._role_folder_right(user, document.folder_id), 'folder_role'),
            (PermissionService._role_document_right(user, document), 'explicit_role'),
        ):
            if right is not None:
                return {'allowed': bool(getattr(right, f'can_{action}', False)),
                        'rule': rule}

        if user.role is not None and user.role.name == 'Admin':
            return {'allowed': True, 'rule': 'admin'}

        level = document.confidentiality_level
        if action in ('view', 'download'):
            if level in ('public', 'internal'):
                return {'allowed': True, 'rule': 'confidentiality'}
            if level == 'confidential':
                return {'allowed': document.department_id == user.department_id,
                        'rule': 'confidentiality'}
            return {'allowed': False, 'rule': 'confidentiality'}
        return {'allowed': False, 'rule': 'no_grant'}

    @staticmethod
    def effective(user, document) -> dict:
        return {action: PermissionService.explain(user, document, action).copy()
                for action in ACTIONS}

    @staticmethod
    def can_view_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'view')['allowed']

    @staticmethod
    def can_download_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'download')['allowed']

    @staticmethod
    def can_edit_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'edit')['allowed']

    @staticmethod
    def can_delete_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'delete')['allowed']

    @staticmethod
    def can_manage_document(user, document) -> bool:
        if is_super_admin(user):
            return True
        return (PermissionService.explain(user, document, 'edit')['allowed']
                or PermissionService.explain(user, document, 'delete')['allowed'])

    @staticmethod
    def explain_folder(user, folder, action: str = 'view') -> dict:
        if action not in ACTIONS:
            return {'allowed': False, 'rule': 'unknown_action'}
        if not is_super_admin(user) and folder.campus_id is not None \
                and folder.campus_id != user.campus_id:
            return {'allowed': False, 'rule': 'campus'}
        for right, rule in (
            (PermissionService._user_folder_right(user, folder.folder_id), 'folder_user'),
            (PermissionService._role_folder_right(user, folder.folder_id), 'folder_role'),
        ):
            if right is not None:
                return {'allowed': bool(getattr(right, f'can_{action}', False)),
                        'rule': rule}
        if user.role is not None and user.role.name == 'Admin':
            return {'allowed': True, 'rule': 'admin'}
        return {'allowed': False, 'rule': 'no_grant'}

    @staticmethod
    def can_user_view_document(user_id, document_id):
        from app.models.document import Document
        from app.models.user import UserAccount
        user = UserAccount.query.get(user_id)
        document = Document.query.get(document_id)
        if user is None or document is None:
            return False
        return PermissionService.can_view_document(user, document)

    @staticmethod
    def can_user_edit_document(user_id, document_id):
        from app.models.document import Document
        from app.models.user import UserAccount
        user = UserAccount.query.get(user_id)
        document = Document.query.get(document_id)
        if user is None or document is None:
            return False
        return PermissionService.can_edit_document(user, document)

    # -- Attribution des droits ------------------------------------------- #

    @staticmethod
    def _rights_row(model, **keys):
        row = model.query.filter_by(**keys).first()
        if row is None:
            row = model(**keys, can_view=False, can_download=False,
                        can_edit=False, can_delete=False)
            db.session.add(row)
        return row

    @staticmethod
    def grant_document_user(user_id, document_id, rights: dict, granted_by) -> Any:
        row = PermissionService._rights_row(
            UserDocumentRight, user_id=user_id, document_id=document_id)
        _set_rights(row, rights)
        row.granted_by = granted_by
        db.session.commit()
        purge_permission_cache()
        return row

    @staticmethod
    def grant_document_role(role_id, document_id, rights: dict, granted_by) -> Any:
        row = PermissionService._rights_row(
            RoleDocumentRight, role_id=role_id, document_id=document_id)
        _set_rights(row, rights)
        row.granted_by = granted_by
        db.session.commit()
        purge_permission_cache()
        return row

    @staticmethod
    def grant_folder_user(user_id, folder_id, rights: dict, granted_by) -> Any:
        row = PermissionService._rights_row(
            UserFolderRight, user_id=user_id, folder_id=folder_id)
        _set_rights(row, rights)
        row.granted_by = granted_by
        db.session.commit()
        purge_permission_cache()
        return row

    @staticmethod
    def grant_folder_role(role_id, folder_id, rights: dict, granted_by) -> Any:
        row = PermissionService._rights_row(
            RoleFolderRight, role_id=role_id, folder_id=folder_id)
        _set_rights(row, rights)
        row.granted_by = granted_by
        db.session.commit()
        purge_permission_cache()
        return row

    @staticmethod
    def revoke(model, **keys) -> bool:
        row = model.query.filter_by(**keys).first()
        if row is None:
            return False
        db.session.delete(row)
        db.session.commit()
        purge_permission_cache()
        return True

    @staticmethod
    def list_document_grants(document_id) -> dict:
        user_rows = UserDocumentRight.query.filter_by(document_id=document_id).all()
        role_rows = RoleDocumentRight.query.filter_by(document_id=document_id).all()
        return {
            'users': [r.to_dict() if hasattr(r, 'to_dict') else {
                'user_id': r.user_id, 'can_view': r.can_view, 'can_download': r.can_download,
                'can_edit': r.can_edit, 'can_delete': r.can_delete} for r in user_rows],
            'roles': [{
                'role_id': r.role_id, 'can_view': r.can_view, 'can_download': r.can_download,
                'can_edit': r.can_edit, 'can_delete': r.can_delete} for r in role_rows],
        }
