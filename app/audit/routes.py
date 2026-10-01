from flask import Blueprint, jsonify, request, send_file

from app.auth.decorators import admin_required
from app.auth.session_auth import get_current_user, session_required
from app.serializers import parse_pagination
from app.services import audit_service

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('', methods=['GET'])
@session_required
@admin_required
def list_audit():
    actor = get_current_user()
    page, per_page = parse_pagination(request.args)
    query = audit_service.list_entries(actor, request.args)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [entry.to_dict() for entry in pagination.items],
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    }), 200


@audit_bp.route('/export', methods=['GET'])
@session_required
@admin_required
def export_audit():
    actor = get_current_user()
    csv_data = audit_service.to_csv(actor, request.args)
    import io

    buffer = io.BytesIO(csv_data.encode('utf-8'))
    buffer.seek(0)
    return send_file(buffer, mimetype='text/csv', as_attachment=True,
                     download_name='audit_export.csv')
