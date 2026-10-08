from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, session_required
from app.auth.decorators import admin_required, role_required
from app.folders.services import FolderService

folders_bp = Blueprint('folders', __name__, url_prefix='/api/folders')


@folders_bp.route('', methods=['GET'])
@session_required
def list_folders():
    actor = get_current_user()
    return jsonify({'folders': FolderService.list_folders(actor, request.args)}), 200


@folders_bp.route('/<int:folder_id>', methods=['GET'])
@session_required
def get_folder(folder_id):
    actor = get_current_user()
    return jsonify(FolderService.get_folder(actor, folder_id).to_dict()), 200


@folders_bp.route('/<int:folder_id>/path', methods=['GET'])
@session_required
def folder_path(folder_id):
    actor = get_current_user()
    return jsonify({'path': FolderService.path(actor, folder_id)}), 200


@folders_bp.route('', methods=['POST'])
@role_required('Admin', 'Secretaire')
def create_folder():
    actor = get_current_user()
    folder = FolderService.create_folder(actor, request.get_json(silent=True) or {})
    return jsonify(folder.to_dict()), 201


@folders_bp.route('/<int:folder_id>', methods=['PATCH'])
@role_required('Admin', 'Secretaire')
def update_folder(folder_id):
    actor = get_current_user()
    folder = FolderService.update_folder(
        actor, folder_id, request.get_json(silent=True) or {})
    return jsonify(folder.to_dict()), 200


@folders_bp.route('/<int:folder_id>/move', methods=['POST'])
@admin_required
def move_folder(folder_id):
    actor = get_current_user()
    data = request.get_json(silent=True) or {}
    folder = FolderService.move_folder(actor, folder_id, data.get('parent_folder_id'))
    return jsonify(folder.to_dict()), 200


@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
@admin_required
def delete_folder(folder_id):
    actor = get_current_user()
    FolderService.delete_folder(actor, folder_id)
    return jsonify({'message': 'Dossier supprimé.'}), 200
