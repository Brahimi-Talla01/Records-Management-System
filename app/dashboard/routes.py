from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, session_required
from app.dashboard.services import DashboardService

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/summary', methods=['GET'])
@session_required
def summary():
    actor = get_current_user()
    return jsonify(DashboardService.summary(actor, request.args)), 200


@dashboard_bp.route('/activity', methods=['GET'])
@session_required
def activity():
    actor = get_current_user()
    return jsonify(DashboardService.activity(actor, request.args)), 200


@dashboard_bp.route('/expiring', methods=['GET'])
@session_required
def expiring():
    actor = get_current_user()
    return jsonify(DashboardService.expiring(actor, request.args)), 200


@dashboard_bp.route('/uploads', methods=['GET'])
@session_required
def uploads():
    actor = get_current_user()
    return jsonify(DashboardService.uploads(actor, request.args)), 200


@dashboard_bp.route('/recent-documents', methods=['GET'])
@session_required
def recent_documents():
    actor = get_current_user()
    return jsonify(DashboardService.recent_documents(actor, request.args)), 200
