from flask import Blueprint, jsonify, request

from app.auth.decorators import super_admin_required
from app.auth.session_auth import get_current_user, session_required
from app.models.retention_report import RetentionReport
from app.serializers import parse_pagination
from app.services import audit_service
from app.services.retention_service import RetentionService

retention_bp = Blueprint('retention', __name__)


@retention_bp.route('/status', methods=['GET'])
@session_required
@super_admin_required
def status():
    return jsonify(RetentionService.status()), 200


@retention_bp.route('/run', methods=['POST'])
@session_required
@super_admin_required
def run():
    actor = get_current_user()
    payload = request.get_json(silent=True) or {}
    dry_run = bool(payload.get('dry_run'))
    report = RetentionService.run(dry_run=dry_run, triggered_by=actor.user_id)
    audit_service.log('retention_run', 'retention',
                      object_id=report.report_id,
                      details={'dry_run': dry_run,
                               'warnings_sent': report.warnings_sent,
                               'archived': report.archived,
                               'purged': report.purged},
                      user_id=actor.user_id)
    return jsonify(report.to_dict()), 200


@retention_bp.route('/reports', methods=['GET'])
@session_required
@super_admin_required
def reports():
    page, per_page = parse_pagination(request.args)
    query = (RetentionReport.query
             .order_by(RetentionReport.ran_at.desc(),
                       RetentionReport.report_id.desc()))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'items': [report.to_dict() for report in pagination.items],
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    }), 200
