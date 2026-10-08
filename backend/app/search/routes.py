from flask import Blueprint, jsonify, request

from app.auth.session_auth import get_current_user, load_session, session_required
from app.search.services import SearchService
from app.serializers import parse_pagination
from extensions import limiter

search_bp = Blueprint('search', __name__)


def _search_rate_limit():
    """Quota par rôle (P5) : les admins cherchent plus souvent."""
    user, _ = load_session()
    if user is not None and user.role is not None and user.role.name == 'Admin':
        return '120 per minute'
    return '60 per minute'


@search_bp.route('', methods=['GET'])
@session_required
@limiter.limit(lambda: _search_rate_limit())
def search():
    actor = get_current_user()
    return jsonify(SearchService.search(actor, request.args)), 200


@search_bp.route('/history', methods=['GET'])
@session_required
def history():
    user = get_current_user()
    page, per_page = parse_pagination(request.args)
    return jsonify(SearchService.history(user.user_id, page, per_page)), 200


@search_bp.route('/history', methods=['DELETE'])
@session_required
def clear_history():
    user = get_current_user()
    deleted = SearchService.clear_history(user.user_id)
    return jsonify({'deleted': deleted}), 200
