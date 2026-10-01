from flask import Blueprint, jsonify, request

from app.auth.session_auth import session_required, get_current_user
from app.auth.decorators import admin_required, super_admin_required
from app.campuses.services import CampusService, InstitutionService

campuses_bp = Blueprint('campuses', __name__)


@campuses_bp.route('/api/institution', methods=['GET'])
def get_institution():
    return jsonify(InstitutionService.get_profile()), 200


@campuses_bp.route('/api/institution', methods=['PUT'])
@admin_required
def update_institution():
    actor = get_current_user()
    profile = InstitutionService.update_profile(
        request.get_json(silent=True) or {}, actor)
    return jsonify(profile), 200


@campuses_bp.route('/api/campuses', methods=['GET'])
@session_required
def list_campuses():
    actor = get_current_user()
    active_only = request.args.get('active_only', 'false').lower() in ('1', 'true', 'yes')
    return jsonify({'campuses': CampusService.list_campuses(actor, active_only)}), 200


@campuses_bp.route('/api/campuses', methods=['POST'])
@super_admin_required
def create_campus():
    actor = get_current_user()
    campus = CampusService.create_campus(
        request.get_json(silent=True) or {}, actor)
    return jsonify(campus), 201


@campuses_bp.route('/api/campuses/<int:campus_id>', methods=['GET'])
@session_required
def get_campus(campus_id):
    actor = get_current_user()
    campus = CampusService.get_campus(campus_id, actor)
    return jsonify(campus.to_dict(include_stats=True)), 200


@campuses_bp.route('/api/campuses/<int:campus_id>', methods=['PUT'])
@super_admin_required
def update_campus(campus_id):
    actor = get_current_user()
    campus = CampusService.update_campus(
        campus_id, request.get_json(silent=True) or {}, actor)
    return jsonify(campus), 200


@campuses_bp.route('/api/campuses/<int:campus_id>/status', methods=['PATCH'])
@super_admin_required
def set_campus_status(campus_id):
    actor = get_current_user()
    data = request.get_json(silent=True) or {}
    is_active = bool(data.get('is_active', True))
    campus = CampusService.set_status(campus_id, is_active, actor)
    return jsonify(campus), 200


@campuses_bp.route('/api/campuses/<int:campus_id>', methods=['DELETE'])
@super_admin_required
def delete_campus(campus_id):
    actor = get_current_user()
    CampusService.delete_campus(campus_id, actor)
    return jsonify({'message': 'Suppression interdite.'}), 409
