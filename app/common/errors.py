"""
Exceptions métier centralisées.

Les services lèvent ces exceptions ; les routes (ou un errorhandler Flask)
les convertissent en réponses JSON uniformes :
    {"error": {"code": "...", "message": "..."}}
"""


class AppError(Exception):
    """Exception de base."""
    status_code = 400
    code = 'app_error'

    def __init__(self, message=None, status_code=None, code=None):
        super().__init__(message or self.code)
        self.message = message or self.code
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code

    def to_dict(self):
        return {'error': {'code': self.code, 'message': self.message}}


class ValidationError(AppError):
    status_code = 400
    code = 'validation_error'


class NotFoundError(AppError):
    status_code = 404
    code = 'not_found'


class PermissionDeniedError(AppError):
    status_code = 403
    code = 'permission_denied'


class AuthenticationError(AppError):
    status_code = 401
    code = 'authentication_error'


class ConflictError(AppError):
    """Ressource en conflit (email/username/matricule déjà utilisés)."""
    status_code = 409
    code = 'conflict'
