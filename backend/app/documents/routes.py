import io

from flask import Blueprint, jsonify, request, send_file

from app.auth.session_auth import get_current_user, session_required
from app.documents.services import DocumentService, safe_download_name
from app.errors import UnprocessableEntityError
from app.permissions.decorators import require_permission
from app.services import audit_service
from app.storage import crypto, get_storage
from extensions import limiter

documents_bp = Blueprint('documents', __name__)

PREVIEWABLE = {'application/pdf', 'image/png', 'image/jpeg', 'image/tiff'}


def _payload():
    if request.form:
        return request.form.to_dict()
    return request.get_json(silent=True) or {}


@documents_bp.route('', methods=['GET'])
@session_required
def list_documents():
    actor = get_current_user()
    return jsonify(DocumentService.list_documents(actor, request.args)), 200


@documents_bp.route('/export', methods=['GET'])
@session_required
def export_documents():
    actor = get_current_user()
    csv_data = DocumentService.export_csv(actor, request.args)
    buffer = io.BytesIO(csv_data.encode('utf-8'))
    buffer.seek(0)
    return send_file(buffer, mimetype='text/csv', as_attachment=True,
                     download_name='documents_export.csv')


@documents_bp.route('/bulk', methods=['POST'])
@session_required
def bulk_documents():
    actor = get_current_user()
    updated = DocumentService.bulk(actor, request.get_json(silent=True) or {})
    return jsonify({'updated': updated}), 200


@documents_bp.route('/<int:document_id>', methods=['GET'])
@require_permission('view')
def get_document(document_id):
    actor = get_current_user()
    document = DocumentService.get_document(actor, document_id)
    return jsonify(document.to_dict(include_versions=True)), 200


@documents_bp.route('', methods=['POST'])
@session_required
@limiter.limit('30 per minute')
def create_document():
    actor = get_current_user()
    document = DocumentService.create_document(actor, _payload(),
                                               request.files.get('file'))
    return jsonify(document.to_dict()), 201


@documents_bp.route('/<int:document_id>', methods=['PATCH'])
@require_permission('edit')
def update_document(document_id):
    actor = get_current_user()
    document = DocumentService.update_document(actor, document_id, _payload())
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<int:document_id>', methods=['DELETE'])
@require_permission('delete')
def delete_document(document_id):
    actor = get_current_user()
    document = DocumentService.soft_delete(actor, document_id)
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<int:document_id>/restore', methods=['POST'])
@require_permission('edit')
def restore_document(document_id):
    actor = get_current_user()
    document = DocumentService.restore(actor, document_id)
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<int:document_id>/versions', methods=['GET'])
@require_permission('view')
def list_versions(document_id):
    actor = get_current_user()
    versions = DocumentService.list_versions(actor, document_id)
    return jsonify({'versions': [v.to_dict() for v in versions]}), 200


@documents_bp.route('/<int:document_id>/versions', methods=['POST'])
@require_permission('edit')
@limiter.limit('30 per minute')
def add_version(document_id):
    actor = get_current_user()
    version = DocumentService.add_version(actor, document_id,
                                          request.files.get('file'),
                                          request.form.get('change_note'))
    return jsonify(version.to_dict()), 201


@documents_bp.route('/<int:document_id>/versions/<int:version_id>/download',
                    methods=['GET'])
@require_permission('download')
def download_version(document_id, version_id):
    actor = get_current_user()
    document, version = DocumentService.version_file(actor, document_id, version_id)
    stream = crypto.readable(get_storage().open(version.storage_url))
    audit_service.log('document_downloaded', 'document',
                      object_id=document.document_id,
                      details={'version': version.version_number},
                      user_id=actor.user_id)
    return send_file(stream, mimetype=version.mime_type or 'application/octet-stream',
                     as_attachment=True,
                     download_name=safe_download_name(document, version))


@documents_bp.route('/<int:document_id>/versions/<int:version_id>/restore',
                    methods=['POST'])
@require_permission('edit')
def restore_version(document_id, version_id):
    actor = get_current_user()
    version = DocumentService.restore_version(actor, document_id, version_id)
    return jsonify(version.to_dict()), 201


@documents_bp.route('/<int:document_id>/preview', methods=['GET'])
@require_permission('view')
def preview_document(document_id):
    actor = get_current_user()
    document, version = DocumentService.latest_version(actor, document_id)
    if (version.mime_type or '') not in PREVIEWABLE:
        raise UnprocessableEntityError("Aperçu indisponible pour ce type de fichier.",
                                       code='preview_not_supported')
    stream = crypto.readable(get_storage().open(version.storage_url))
    return send_file(stream, mimetype=version.mime_type, as_attachment=False,
                     download_name=safe_download_name(document, version))


@documents_bp.route('/<int:document_id>/tags', methods=['POST'])
@require_permission('edit')
def add_tags(document_id):
    actor = get_current_user()
    names = (request.get_json(silent=True) or {}).get('tags') or []
    document = DocumentService.add_tags(actor, document_id, names)
    return jsonify(document.to_dict()), 200


@documents_bp.route('/<int:document_id>/tags', methods=['DELETE'])
@require_permission('edit')
def remove_tags(document_id):
    actor = get_current_user()
    names = (request.get_json(silent=True) or {}).get('tags') or []
    document = DocumentService.remove_tags(actor, document_id, names)
    return jsonify(document.to_dict()), 200
