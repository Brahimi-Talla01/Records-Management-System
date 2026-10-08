from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, session_required
from app.auth.decorators import admin_required
from app.documents.repositories import DocumentRepository
from app.errors import NotFoundError, PermissionDeniedError, ValidationError
from app.folders.services import FolderService
from app.models.folder import Folder
from app.models.role import Role
from app.models.role_document_right import RoleDocumentRight
from app.models.role_folder_right import RoleFolderRight
from app.models.user import UserAccount
from app.models.user_document_right import UserDocumentRight
from app.models.user_folder_right import UserFolderRight
from app.services import audit_service
from app.services.permission_service import ACTIONS, PermissionService

permissions_bp = Blueprint('permissions', __name__, url_prefix='/api/permissions')


def _document_or_404(document_id):
    document = DocumentRepository.get(document_id)
    if document is None:
        raise NotFoundError("Document introuvable.", code='document_not_found')
    return document


def _require_manage(actor, document):
    if not PermissionService.can_manage_document(actor, document):
        raise PermissionDeniedError("Gestion des droits non autorisée.",
                                    code='permission_manage_forbidden')


def _rights_from_payload(payload):
    rights = {}
    for action in ACTIONS:
        if action in payload:
            rights[action] = payload[action]
        elif f'can_{action}' in payload:
            rights[action] = payload[f'can_{action}']
    return rights


def _audit(action, subject, object_id, actor, details):
    audit_service.log(action, subject, object_id=object_id, details=details,
                      user_id=actor.user_id)


@permissions_bp.route('/document/<int:document_id>', methods=['GET'])
@session_required
def document_effective(document_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    if not PermissionService.can_view_document(actor, document):
        raise PermissionDeniedError("Accès au document interdit.",
                                    code='document_forbidden')
    return jsonify({
        'document_id': document.document_id,
        'effective': PermissionService.effective(actor, document),
    }), 200


@permissions_bp.route('/document/<int:document_id>/grants', methods=['GET'])
@session_required
def document_grants(document_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    _require_manage(actor, document)
    return jsonify(PermissionService.list_document_grants(document_id)), 200


@permissions_bp.route('/document/<int:document_id>/user/<int:user_id>', methods=['PUT'])
@session_required
def grant_document_user(document_id, user_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    _require_manage(actor, document)
    if UserAccount.query.get(user_id) is None:
        raise NotFoundError("Utilisateur introuvable.", code='user_not_found')
    rights = _rights_from_payload(request.get_json(silent=True) or {})
    PermissionService.grant_document_user(user_id, document_id, rights, actor.user_id)
    _audit('permission_granted', 'document', document_id, actor,
           {'user_id': user_id, 'rights': rights})
    return jsonify({'message': 'Droits accordés.'}), 200


@permissions_bp.route('/document/<int:document_id>/user/<int:user_id>', methods=['DELETE'])
@session_required
def revoke_document_user(document_id, user_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    _require_manage(actor, document)
    if not PermissionService.revoke(UserDocumentRight, user_id=user_id,
                                    document_id=document_id):
        raise NotFoundError("Droit introuvable.", code='grant_not_found')
    _audit('permission_revoked', 'document', document_id, actor, {'user_id': user_id})
    return jsonify({'message': 'Droits révoqués.'}), 200


@permissions_bp.route('/document/<int:document_id>/role/<int:role_id>', methods=['PUT'])
@session_required
def grant_document_role(document_id, role_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    _require_manage(actor, document)
    if Role.query.get(role_id) is None:
        raise NotFoundError("Rôle introuvable.", code='role_not_found')
    rights = _rights_from_payload(request.get_json(silent=True) or {})
    PermissionService.grant_document_role(role_id, document_id, rights, actor.user_id)
    _audit('permission_granted', 'document', document_id, actor,
           {'role_id': role_id, 'rights': rights})
    return jsonify({'message': 'Droits accordés.'}), 200


@permissions_bp.route('/document/<int:document_id>/role/<int:role_id>', methods=['DELETE'])
@session_required
def revoke_document_role(document_id, role_id):
    actor = get_current_user()
    document = _document_or_404(document_id)
    _require_manage(actor, document)
    if not PermissionService.revoke(RoleDocumentRight, role_id=role_id,
                                    document_id=document_id):
        raise NotFoundError("Droit introuvable.", code='grant_not_found')
    _audit('permission_revoked', 'document', document_id, actor, {'role_id': role_id})
    return jsonify({'message': 'Droits révoqués.'}), 200


@permissions_bp.route('/folder/<int:folder_id>/user/<int:user_id>', methods=['PUT'])
@admin_required
def grant_folder_user(folder_id, user_id):
    actor = get_current_user()
    FolderService.get_folder(actor, folder_id)
    if UserAccount.query.get(user_id) is None:
        raise NotFoundError("Utilisateur introuvable.", code='user_not_found')
    rights = _rights_from_payload(request.get_json(silent=True) or {})
    PermissionService.grant_folder_user(user_id, folder_id, rights, actor.user_id)
    _audit('permission_granted', 'folder', folder_id, actor,
           {'user_id': user_id, 'rights': rights})
    return jsonify({'message': 'Droits accordés.'}), 200


@permissions_bp.route('/folder/<int:folder_id>/user/<int:user_id>', methods=['DELETE'])
@admin_required
def revoke_folder_user(folder_id, user_id):
    actor = get_current_user()
    FolderService.get_folder(actor, folder_id)
    if not PermissionService.revoke(UserFolderRight, user_id=user_id,
                                    folder_id=folder_id):
        raise NotFoundError("Droit introuvable.", code='grant_not_found')
    _audit('permission_revoked', 'folder', folder_id, actor, {'user_id': user_id})
    return jsonify({'message': 'Droits révoqués.'}), 200


@permissions_bp.route('/folder/<int:folder_id>/role/<int:role_id>', methods=['PUT'])
@admin_required
def grant_folder_role(folder_id, role_id):
    actor = get_current_user()
    FolderService.get_folder(actor, folder_id)
    if Role.query.get(role_id) is None:
        raise NotFoundError("Rôle introuvable.", code='role_not_found')
    rights = _rights_from_payload(request.get_json(silent=True) or {})
    PermissionService.grant_folder_role(role_id, folder_id, rights, actor.user_id)
    _audit('permission_granted', 'folder', folder_id, actor,
           {'role_id': role_id, 'rights': rights})
    return jsonify({'message': 'Droits accordés.'}), 200


@permissions_bp.route('/folder/<int:folder_id>/role/<int:role_id>', methods=['DELETE'])
@admin_required
def revoke_folder_role(folder_id, role_id):
    actor = get_current_user()
    FolderService.get_folder(actor, folder_id)
    if not PermissionService.revoke(RoleFolderRight, role_id=role_id,
                                    folder_id=folder_id):
        raise NotFoundError("Droit introuvable.", code='grant_not_found')
    _audit('permission_revoked', 'folder', folder_id, actor, {'role_id': role_id})
    return jsonify({'message': 'Droits révoqués.'}), 200


@permissions_bp.route('/check', methods=['POST'])
@session_required
def check_permission():
    actor = get_current_user()
    data = request.get_json(silent=True) or {}
    subject = data.get('object', 'document')
    action = data.get('action', 'view')
    if action not in ACTIONS:
        raise ValidationError("Action inconnue.", code='unknown_action',
                              details={'action': action})

    target = actor
    if data.get('user_id') and data['user_id'] != actor.user_id:
        if not actor.is_super_admin and actor.role.name != 'Admin':
            raise PermissionDeniedError("Réservé aux administrateurs.",
                                        code='admin_required')
        target = UserAccount.query.get(data['user_id'])
        if target is None:
            raise NotFoundError("Utilisateur introuvable.", code='user_not_found')

    if subject == 'document':
        document = _document_or_404(data.get('id'))
        result = PermissionService.explain(target, document, action)
    elif subject == 'folder':
        folder = Folder.query.get(data.get('id')) if data.get('id') else None
        if folder is None:
            raise NotFoundError("Dossier introuvable.", code='folder_not_found')
        result = PermissionService.explain_folder(target, folder, action)
    else:
        raise ValidationError("Objet inconnu : attendu 'document' ou 'folder'.",
                              code='unknown_subject')

    return jsonify({'allowed': result['allowed'], 'reason': result['rule']}), 200
