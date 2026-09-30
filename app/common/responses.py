"""
Helpers de sérialisation uniforme des réponses.
"""

from flask import jsonify


def ok(data=None, message=None, status=200):
    """Réponse de succès."""
    body = {}
    if data is not None:
        body.update(data if isinstance(data, dict) else {'data': data})
    if message:
        body['message'] = message
    return jsonify(body), status


def error_response(message, status=400, code='error'):
    """Réponse d'erreur uniforme."""
    return jsonify({'error': {'code': code, 'message': message}}), status


def paginated(items, total, page, per_page, key='items'):
    """Réponse paginée standard."""
    return jsonify({
        key: items,
        'total': total,
        'pages': (total + per_page - 1) // per_page if per_page else 1,
        'current_page': page,
        'per_page': per_page,
    }), 200
