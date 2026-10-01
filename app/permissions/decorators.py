from functools import wraps

from app.auth.session_auth import get_current_user, session_required
from app.documents.repositories import DocumentRepository
from app.errors import NotFoundError, PermissionDeniedError
from app.services import audit_service
from app.services.permission_service import PermissionService


def _denied(user, subject, object_id, action, rule):
    audit_service.log('permission_denied', subject, object_id=object_id,
                      details={'action': action, 'rule': rule},
                      user_id=user.user_id)


def require_permission(action, subject='document'):
    def decorator(fn):
        @wraps(fn)
        @session_required
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if subject == 'document':
                document = DocumentRepository.get(kwargs.get('document_id'))
                if document is None:
                    raise NotFoundError("Document introuvable.", code='document_not_found')
                result = PermissionService.explain(user, document, action)
                if not result['allowed']:
                    _denied(user, 'document', document.document_id, action, result['rule'])
                    raise PermissionDeniedError(
                        "Action non autorisée sur ce document.",
                        code='document_forbidden',
                        details={'action': action, 'rule': result['rule']},
                    )
            return fn(*args, **kwargs)
        return wrapper
    return decorator
