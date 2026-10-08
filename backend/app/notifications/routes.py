from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, session_required
from app.serializers import parse_pagination
from app.services.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)


def _unread_flag(value) -> bool:
    return str(value).lower() in ('1', 'true', 'yes')


@notifications_bp.route('', methods=['GET'])
@session_required
def list_notifications():
    user = get_current_user()
    page, per_page = parse_pagination(request.args)
    unread_only = _unread_flag(request.args.get('unread'))
    return jsonify(NotificationService.list_for(
        user.user_id, unread_only=unread_only, page=page, per_page=per_page)), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@session_required
def unread_count():
    user = get_current_user()
    return jsonify({'unread': NotificationService.unread_count(user.user_id)}), 200


@notifications_bp.route('/read-all', methods=['POST'])
@session_required
def read_all():
    user = get_current_user()
    updated = NotificationService.mark_all_read(user.user_id)
    return jsonify({'updated': updated}), 200


@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@session_required
def mark_read(notification_id):
    user = get_current_user()
    notification = NotificationService.mark_read(user.user_id, notification_id)
    return jsonify(notification.to_dict()), 200


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@session_required
def delete_notification(notification_id):
    user = get_current_user()
    NotificationService.delete(user.user_id, notification_id)
    return jsonify({'deleted': True}), 200
