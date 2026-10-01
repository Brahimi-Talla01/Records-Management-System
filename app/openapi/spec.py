"""
Spécification OpenAPI 3 (P6 du plan 07).

La spec est **dérivée du code** : carte des routes Flask + marqueurs `__guards__`
posés par les décorateurs d'authentification. Une route ajoutée, renommée ou
protégée différemment y apparaît automatiquement — `tests/test_openapi.py`
impose la couverture totale des routes et la cohérence des tables d'annotation.

Seuls les éléments non introspectables sont déclarés à la main :
`QUERY_PARAMS` (paramètres d'URL), `CREATED` (statut 201), `BINARY` (réponses
fichiers) et `UPLOADS` (multipart → 413/422). Chaque entrée de ces tables doit
pointer vers une route réelle, sinon les tests échouent.
"""

from __future__ import annotations

import inspect
import os
import re

from flask import Flask

OPENAPI_VERSION = '3.0.3'

_RULE_RE = re.compile(r'<(?:([a-z_]+):)?([^>]+)>')
_CONVERTER_TYPES = {'int': 'integer', 'float': 'number'}
_MUTATING = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})

GUARD_LABELS = {
    'session': 'session opaque',
    'admin': 'administrateur',
    'super_admin': 'super administrateur',
    'role': 'rôles prédéfinis',
    'department': 'accès au département',
    'permission': 'moteur de permissions D6',
}

TAG_LABELS = {
    'auth': 'Authentification',
    'users': 'Utilisateurs',
    'campuses': 'Institution & campus',
    'settings': 'Réglages',
    'folders': 'Dossiers',
    'referentials': 'Référentiels',
    'documents': 'Documents',
    'permissions': 'Permissions',
    'search': 'Recherche',
    'dashboard': 'Tableau de bord',
    'notifications': 'Notifications',
    'audit': 'Audit',
    'retention': 'Rétention',
    'system': 'Système',
}

CREATED = frozenset({
    'campuses.create_campus',
    'documents.create_document',
    'documents.add_version',
    'documents.restore_version',
    'folders.create_folder',
    'referentials.create_department',
    'referentials.create_doc_type',
    'referentials.create_tag',
    'referentials.create_role',
    'users.create_user',
})

BINARY = {
    'users.export_users': 'text/csv',
    'documents.export_documents': 'text/csv',
    'audit.export_audit': 'text/csv',
    'documents.download_version': 'application/octet-stream',
    'documents.preview_document': 'application/octet-stream',
}

UPLOADS = frozenset({'documents.create_document', 'documents.add_version',
                     'users.import_users'})


def _q(name: str, type_: str = 'string', description: str = '') -> dict:
    param = {
        'name': name,
        'in': 'query',
        'required': False,
        'schema': {'type': type_},
    }
    if description:
        param['description'] = description
    return param


_PAGE = (
    _q('page', 'integer', 'Page (démarrage à 1)'),
    _q('per_page', 'integer', 'Éléments par page (max 100)'),
)

_DOCUMENT_FILTERS = (
    _q('q', 'string', 'Requête plein texte'),
    _q('folder_id', 'integer'),
    _q('department_id', 'integer'),
    _q('doc_type_id', 'integer'),
    _q('campus_id', 'integer', 'Super administrateur uniquement'),
    _q('status', 'string', "Statut, 'active' par défaut"),
    _q('confidentiality', 'string', 'public | internal | confidential | secret'),
    _q('tag_ids', 'string', 'Identifiants séparés par des virgules'),
    _q('created_from', 'string', 'Date ISO 8601'),
    _q('created_to', 'string', 'Date ISO 8601'),
    _q('sort', 'string', 'Colonne de tri'),
    _q('order', 'string', 'asc | desc'),
)

_KEYSET_PARAMS = (
    _q('pagination', 'string', '`offset` (défaut) ou `keyset` (page suivante sans COUNT)'),
    _q('cursor', 'string', 'Curseur renvoyé par `next_cursor` (implique `keyset`)'),
)

_SEARCH_FILTERS = (
    _q('q', 'string', 'Requête plein texte'),
    _q('folder_id', 'integer'),
    _q('department_id', 'integer'),
    _q('doc_type_id', 'integer'),
    _q('campus_id', 'integer', 'Super administrateur uniquement'),
    _q('status', 'string', "Statut, 'active' par défaut"),
    _q('confidentiality', 'string', 'public | internal | confidential | secret'),
    _q('tag_ids', 'string', 'Identifiants séparés par des virgules'),
    _q('date_from', 'string', 'Date ISO 8601'),
    _q('date_to', 'string', 'Date ISO 8601'),
) + _PAGE

_AUDIT_FILTERS = (
    _q('action', 'string', "Type d'événement, ex. `user_created`"),
    _q('object_type', 'string', "Type d'objet, ex. `document`"),
    _q('user_id', 'integer'),
    _q('from', 'string', 'Date ISO 8601'),
    _q('to', 'string', 'Date ISO 8601'),
    _q('campus_id', 'integer', 'Super administrateur uniquement'),
) + _PAGE

_USER_FILTERS = (
    _q('search', 'string', 'Nom, email ou matricule'),
    _q('role_id', 'integer'),
    _q('department_id', 'integer'),
    _q('is_active', 'string', 'true | false'),
) + _PAGE

_FOLDER_FILTERS = (
    _q('view', 'string', '`tree` pour l’arborescence complète'),
    _q('parent_id', 'integer'),
    _q('campus_id', 'integer'),
    _q('department_id', 'integer'),
)

QUERY_PARAMS: dict[tuple[str, str], tuple[dict, ...]] = {
    ('GET', '/api/documents'): _DOCUMENT_FILTERS + _PAGE + _KEYSET_PARAMS,
    ('GET', '/api/documents/export'): _DOCUMENT_FILTERS + _PAGE,
    ('GET', '/api/search'): _SEARCH_FILTERS,
    ('GET', '/api/audit'): _AUDIT_FILTERS,
    ('GET', '/api/audit/export'): _AUDIT_FILTERS,
    ('GET', '/api/users'): _USER_FILTERS,
    ('GET', '/api/users/export'): _USER_FILTERS,
    ('GET', '/api/folders'): _FOLDER_FILTERS,
    ('GET', '/api/campuses'): (_q('active_only', 'string', '1 | true | yes'),),
    ('GET', '/api/notifications'): (_q('unread', 'integer', '`1` = non lues'),) + _PAGE,
    ('GET', '/api/dashboard/activity'): (_q('days', 'integer', 'Période en jours (30 à 365)'),),
    ('GET', '/api/dashboard/expiring'): (_q('days', 'integer', 'Période en jours (30 à 365)'),),
    ('GET', '/api/dashboard/uploads'): (_q('months', 'integer', 'Mois affichés (12 à 24)'),),
    ('GET', '/api/dashboard/recent-documents'): (_q('limit', 'integer', 'Nombre de documents (10 à 50)'),),
    ('GET', '/api/dashboard/summary'): (_q('campus_id', 'integer', 'Super administrateur uniquement'),),
    ('GET', '/api/admin/retention/reports'): _PAGE,
}

CSRF_PARAM = {
    'name': 'X-CSRF-Token',
    'in': 'header',
    'required': True,
    'schema': {'type': 'string'},
    'description': 'Double-submit : jeton porté par le cookie CSRF.',
}


def openapi_path(rule: str) -> str:
    return _RULE_RE.sub(lambda m: '{%s}' % m.group(2), rule)


def _path_params(rule: str) -> list[dict]:
    params = []
    for match in _RULE_RE.finditer(rule):
        converter, name = match.group(1), match.group(2)
        params.append({
            'name': name,
            'in': 'path',
            'required': True,
            'schema': {'type': _CONVERTER_TYPES.get(converter or 'string', 'string')},
        })
    return params


def _tag(endpoint: str) -> str:
    prefix = endpoint.split('.')[0]
    return prefix if prefix in TAG_LABELS else 'system'


def _summary(view, method: str, path: str) -> str:
    doc = inspect.getdoc(view)
    return doc.splitlines()[0] if doc else '%s %s' % (method, path)


def _error_response(description: str) -> dict:
    return {
        'description': description,
        'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}},
    }


def _operation(method: str, endpoint: str, rule: str, view, csrf_header: str) -> dict:
    guards: frozenset[str] = frozenset(getattr(view, '__guards__', ()))
    path = openapi_path(rule)

    op: dict = {
        'tags': [_tag(endpoint)],
        'summary': _summary(view, method, path),
        'operationId': '%s_%s' % (method.lower(), endpoint),
        'parameters': _path_params(rule) + list(QUERY_PARAMS.get((method, rule), ())),
        'responses': {},
    }

    description = []
    if guards:
        description.append('Accès : ' + ' + '.join(
            GUARD_LABELS.get(guard, guard) for guard in sorted(guards)))
        op['security'] = [{'cookieAuth': []}]
    else:
        op['security'] = []
    if method in _MUTATING:
        description.append('CSRF : header `%s` requis' % csrf_header)
        op['parameters'].append(dict(CSRF_PARAM, name=csrf_header))
    if description:
        op['description'] = ' · '.join(description)

    if endpoint in BINARY:
        media = BINARY[endpoint]
        success_content = {'content': {media: {'schema': {
            'type': 'string', 'format': 'binary'}}}}
    else:
        success_content = {'content': {'application/json': {'schema': {
            'type': 'object'}}}}
    op['responses']['201' if endpoint in CREATED else '200'] = dict(
        {'description': 'Succès'}, **success_content)

    if guards:
        op['responses']['401'] = _error_response('Session absente ou expirée.')
        op['responses']['403'] = _error_response('Rôle, périmètre campus ou CSRF refusé.')
    if _RULE_RE.search(rule):
        op['responses']['404'] = _error_response('Ressource absente ou hors périmètre.')
    if method in _MUTATING:
        op['responses']['400'] = _error_response('Corps ou paramètres invalides.')
        op['responses']['409'] = _error_response('Conflit (unicité, ressource rattachée).')
    if endpoint in UPLOADS:
        op['responses']['413'] = _error_response('Fichier supérieur à la taille maximale.')
        op['responses']['422'] = _error_response('Extension, magic bytes ou contenu refusé.')
    op['responses']['429'] = _error_response('Quota de débit dépassé.')

    op['responses'] = dict(sorted(op['responses'].items(), key=lambda kv: int(kv[0])))
    return op


def _error_schema() -> dict:
    return {
        'type': 'object',
        'required': ['error', 'code'],
        'properties': {
            'error': {'type': 'string'},
            'code': {'type': 'string', 'description': 'Code stable, testable.'},
            'details': {'type': 'object', 'additionalProperties': True},
        },
    }


def build_spec(app: Flask) -> dict:
    """Construit la spécification OpenAPI à partir de l'application Flask."""
    csrf_header = app.config.get('CSRF_HEADER_NAME', 'X-CSRF-Token')

    paths: dict[str, dict] = {}
    tags = set()
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: (r.rule, r.endpoint)):
        if rule.endpoint == 'static':
            continue
        path = openapi_path(rule.rule)
        if not (path.startswith('/api') or path.startswith('/health')):
            continue
        view = app.view_functions[rule.endpoint]
        methods = rule.methods or set()
        for method in sorted(methods - {'HEAD', 'OPTIONS'}):
            op = _operation(method, rule.endpoint, rule.rule, view, csrf_header)
            paths.setdefault(path, {})[method.lower()] = op
            tags.update(op['tags'])

    return {
        'openapi': OPENAPI_VERSION,
        'info': {
            'title': 'UniArchive API',
            'version': os.environ.get('APP_VERSION', '1.0.0'),
            'description': (
                'API de gestion d’archives numériques multi-campus. '
                'Authentification par session opaque (cookies) ; toute mutation '
                'exige le header CSRF. Enveloppe d’erreur : '
                '`{"error", "code", "details"}`. Contrat détaillé : '
                'assets/08_api_reference.md.'
            ),
        },
        'servers': [{'url': '/'}],
        'tags': [{'name': tag, 'description': TAG_LABELS[tag]}
                 for tag in sorted(tags)],
        'security': [{'cookieAuth': []}],
        'paths': paths,
        'components': {
            'securitySchemes': {
                'cookieAuth': {
                    'type': 'apiKey',
                    'in': 'cookie',
                    'name': app.config.get('SESSION_COOKIE_NAME', 'uniarchive_session'),
                },
            },
            'schemas': {'Error': _error_schema()},
        },
    }
