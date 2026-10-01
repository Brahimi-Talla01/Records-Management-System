from app.models.role_document_right import RoleDocumentRight
from app.models.user_document_right import UserDocumentRight
from app.scope import is_super_admin

ACTIONS = ('view', 'download', 'edit', 'delete')


class PermissionService:

    @staticmethod
    def _explicit_right(user, document):
        user_right = UserDocumentRight.query.filter_by(
            user_id=user.user_id, document_id=document.document_id).first()
        if user_right is not None:
            return user_right
        return RoleDocumentRight.query.filter_by(
            role_id=user.role_id, document_id=document.document_id).first()

    @staticmethod
    def _campus_allowed(user, document) -> bool:
        if is_super_admin(user):
            return True
        return document.campus_id == user.campus_id

    @staticmethod
    def explain(user, document, action: str = 'view'):
        if action not in ACTIONS:
            return False, 'unknown_action'
        if not PermissionService._campus_allowed(user, document):
            return False, 'campus'
        if user.role is not None and user.role.name == 'Admin':
            return True, 'admin'

        explicit = PermissionService._explicit_right(user, document)
        if explicit is not None:
            allowed = bool(getattr(explicit, f'can_{action}', False))
            return allowed, 'explicit'

        level = document.confidentiality_level
        if action in ('view', 'download'):
            if level in ('public', 'internal'):
                return True, 'confidentiality'
            if level == 'confidential':
                return document.department_id == user.department_id, 'confidentiality'
            return False, 'confidentiality'

        return False, 'no_grant'

    @staticmethod
    def can_view_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'view')[0]

    @staticmethod
    def can_download_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'download')[0]

    @staticmethod
    def can_edit_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'edit')[0]

    @staticmethod
    def can_delete_document(user, document) -> bool:
        return PermissionService.explain(user, document, 'delete')[0]

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
