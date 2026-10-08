from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user
from app.auth.decorators import admin_required
from app.errors import PermissionDeniedError, ValidationError
from app.scope import require_campus_access, resolve_campus_id
from app.services import audit_service
from app.settings.registry import REGISTRY, categories
from app.settings.service import SettingService

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')


@settings_bp.route('', methods=['GET'])
@admin_required
def get_settings():
    user = get_current_user()
    campus_id = resolve_campus_id(user, request.args.get('campus_id'))
    return jsonify({
        'campus_id': campus_id,
        'settings': SettingService.effective_many(campus_id),
    }), 200


@settings_bp.route('/schema', methods=['GET'])
@admin_required
def get_schema():
    return jsonify({
        'categories': categories(),
        'settings': [defn.to_dict() for defn in REGISTRY.values()],
    }), 200


@settings_bp.route('/public', methods=['GET'])
def get_public_settings():
    campus_id = request.args.get('campus_id', type=int)
    return jsonify({'settings': SettingService.public_values(campus_id)}), 200


@settings_bp.route('/defaults', methods=['GET'])
@admin_required
def get_defaults():
    return jsonify({'settings': SettingService.defaults()}), 200


def _normalized_items(payload) -> list[dict]:
    if isinstance(payload, dict) and isinstance(payload.get('settings'), list):
        items = payload['settings']
    elif isinstance(payload, dict) and payload.get('key'):
        items = [payload]
    else:
        raise ValidationError(
            "Corps attendu : {'settings': [{key, value, …}]} ou {key, value}.",
            code='invalid_settings_payload',
        )
    for item in items:
        if not isinstance(item, dict) or not item.get('key'):
            raise ValidationError("Chaque réglage doit porter une clé `key`.",
                                  code='invalid_setting_item')
    return items


@settings_bp.route('', methods=['PUT'])
@admin_required
def update_settings():
    user = get_current_user()
    items = _normalized_items(request.get_json(silent=True) or {})

    updated = []
    for item in items:
        key = item['key']
        scope = item.get('scope', 'global')
        if scope not in ('global', 'campus'):
            raise ValidationError("Portée invalide : attendu 'global' ou 'campus'.",
                                  code='invalid_scope', details={'key': key})

        if scope == 'global':
            if not user.is_super_admin:
                raise PermissionDeniedError(
                    "Seul le super administrateur peut modifier un réglage global.",
                    code='super_admin_required', details={'key': key})
            campus_id = None
        else:
            campus_id = item.get('campus_id') or user.campus_id
            if campus_id is None:
                raise ValidationError("campus_id requis pour un réglage de campus.",
                                      code='missing_campus', details={'key': key})
            campus_id = int(campus_id)
            require_campus_access(user, campus_id)

        row = SettingService.set_value(
            key, item.get('value'), scope=scope, campus_id=campus_id,
            updated_by=user.user_id,
        )
        updated.append(row.to_dict())

    audit_service.log(
        'settings_updated', 'setting',
        details={'keys': [u['key'] for u in updated]},
        user_id=user.user_id,
    )
    return jsonify({'updated': updated}), 200
