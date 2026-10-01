from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, session_required
from app.auth.decorators import admin_required
from app.referentials.services import (DepartmentService, DocTypeService,
                                       RoleService, TagService)

referentials_bp = Blueprint('referentials', __name__)


@referentials_bp.route('/api/departments', methods=['GET'])
@session_required
def list_departments():
    actor = get_current_user()
    departments = DepartmentService.list_departments(actor, request.args)
    return jsonify({'departments': [d.to_dict() for d in departments]}), 200


@referentials_bp.route('/api/departments', methods=['POST'])
@admin_required
def create_department():
    actor = get_current_user()
    department = DepartmentService.create_department(
        actor, request.get_json(silent=True) or {})
    return jsonify(department.to_dict()), 201


@referentials_bp.route('/api/departments/<int:department_id>', methods=['GET'])
@session_required
def get_department(department_id):
    actor = get_current_user()
    department = DepartmentService.get_department(actor, department_id)
    return jsonify(department.to_dict()), 200


@referentials_bp.route('/api/departments/<int:department_id>', methods=['PATCH'])
@admin_required
def update_department(department_id):
    actor = get_current_user()
    department = DepartmentService.update_department(
        actor, department_id, request.get_json(silent=True) or {})
    return jsonify(department.to_dict()), 200


@referentials_bp.route('/api/departments/<int:department_id>', methods=['DELETE'])
@admin_required
def delete_department(department_id):
    actor = get_current_user()
    DepartmentService.delete_department(actor, department_id)
    return jsonify({'message': 'Département supprimé.'}), 200


@referentials_bp.route('/api/doc-types', methods=['GET'])
@session_required
def list_doc_types():
    return jsonify({'doc_types': [d.to_dict() for d in DocTypeService.list_doc_types()]}), 200


@referentials_bp.route('/api/doc-types', methods=['POST'])
@admin_required
def create_doc_type():
    actor = get_current_user()
    doc_type = DocTypeService.create_doc_type(actor, request.get_json(silent=True) or {})
    return jsonify(doc_type.to_dict()), 201


@referentials_bp.route('/api/doc-types/<int:doc_type_id>', methods=['GET'])
@session_required
def get_doc_type(doc_type_id):
    return jsonify(DocTypeService.get_doc_type(doc_type_id).to_dict()), 200


@referentials_bp.route('/api/doc-types/<int:doc_type_id>', methods=['PATCH'])
@admin_required
def update_doc_type(doc_type_id):
    actor = get_current_user()
    doc_type = DocTypeService.update_doc_type(
        actor, doc_type_id, request.get_json(silent=True) or {})
    return jsonify(doc_type.to_dict()), 200


@referentials_bp.route('/api/doc-types/<int:doc_type_id>', methods=['DELETE'])
@admin_required
def delete_doc_type(doc_type_id):
    actor = get_current_user()
    DocTypeService.delete_doc_type(actor, doc_type_id)
    return jsonify({'message': 'Type supprimé.'}), 200


@referentials_bp.route('/api/tags', methods=['GET'])
@session_required
def list_tags():
    return jsonify({'tags': [t.to_dict() for t in TagService.list_tags()]}), 200


@referentials_bp.route('/api/tags', methods=['POST'])
@admin_required
def create_tag():
    actor = get_current_user()
    tag = TagService.create_tag(actor, request.get_json(silent=True) or {})
    return jsonify(tag.to_dict()), 201


@referentials_bp.route('/api/tags/<int:tag_id>', methods=['DELETE'])
@admin_required
def delete_tag(tag_id):
    actor = get_current_user()
    TagService.delete_tag(actor, tag_id)
    return jsonify({'message': 'Tag supprimé.'}), 200


@referentials_bp.route('/api/roles', methods=['GET'])
@admin_required
def list_roles():
    return jsonify({'roles': [r.to_dict() for r in RoleService.list_roles()]}), 200


@referentials_bp.route('/api/roles', methods=['POST'])
@admin_required
def create_role():
    actor = get_current_user()
    role = RoleService.create_role(actor, request.get_json(silent=True) or {})
    return jsonify(role.to_dict()), 201


@referentials_bp.route('/api/roles/<int:role_id>', methods=['GET'])
@admin_required
def get_role(role_id):
    return jsonify(RoleService.get_role(role_id).to_dict()), 200


@referentials_bp.route('/api/roles/<int:role_id>', methods=['PATCH'])
@admin_required
def update_role(role_id):
    actor = get_current_user()
    role = RoleService.update_role(actor, role_id,
                                   request.get_json(silent=True) or {})
    return jsonify(role.to_dict()), 200


@referentials_bp.route('/api/roles/<int:role_id>', methods=['DELETE'])
@admin_required
def delete_role(role_id):
    actor = get_current_user()
    RoleService.delete_role(actor, role_id)
    return jsonify({'message': 'Rôle supprimé.'}), 200
