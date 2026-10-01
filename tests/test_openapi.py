"""
Documentation OpenAPI (P6 du plan 07).

Ces tests verrouillent deux choses :
- la spécification reste **complète** : toute route enregistrée y figure, avec
  son résumé, son identifiant unique et ses réponses d'erreur ;
- la spécification reste **honête** : le garde documenté est bien celui posé
  par les décorateurs, et aucune route mutante n'est ouverte par oubli.
"""

import pytest

from app.openapi.spec import (BINARY, CREATED, QUERY_PARAMS, TAG_LABELS,
                              UPLOADS, build_spec, openapi_path)

# Seules routes volontairement publiques : toute autre opération sans garde
# signalée ici fait échouer la suite.
PUBLIC_OPERATIONS = {
    ('get', '/health'),
    ('get', '/health/ready'),
    ('get', '/api/docs'),
    ('get', '/api/institution'),
    ('get', '/api/openapi.json'),
    ('get', '/api/settings/public'),
    ('get', '/api/version'),
    ('post', '/api/auth/forgot-password'),
    ('post', '/api/auth/login'),
    ('post', '/api/auth/reset-password'),
    ('post', '/api/auth/verify-2fa'),
}

MUTATING = {'post', 'put', 'patch', 'delete'}


@pytest.fixture
def spec(app):
    return build_spec(app)


def _documented(spec):
    for path, methods in spec['paths'].items():
        for method, operation in methods.items():
            yield method, path, operation


def _routes(app):
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
        path = openapi_path(rule.rule)
        if not (path.startswith('/api') or path.startswith('/health')):
            continue
        view = app.view_functions[rule.endpoint]
        for method in (rule.methods or set()) - {'HEAD', 'OPTIONS'}:
            yield method.lower(), path, view


def test_spec_structure(client):
    response = client.get('/api/openapi.json')
    assert response.status_code == 200
    spec = response.get_json()
    assert spec['openapi'] == '3.0.3'
    assert spec['info']['title'] == 'UniArchive API'
    cookie = spec['components']['securitySchemes']['cookieAuth']
    assert cookie == {'type': 'apiKey', 'in': 'cookie', 'name': 'uniarchive_session'}
    assert spec['components']['schemas']['Error']['required'] == ['error', 'code']


def test_every_route_is_documented(app, spec):
    expected = {(method, path) for method, path, _ in _routes(app)}
    assert {(method, path) for method, path, _ in _documented(spec)} == expected


def test_operations_are_complete(spec):
    operation_ids = set()
    for method, path, operation in _documented(spec):
        assert operation['summary'], 'résumé manquant : %s %s' % (method, path)
        assert operation['tags'][0] in TAG_LABELS, 'tag inconnu : %s' % path
        assert operation['operationId'] not in operation_ids
        operation_ids.add(operation['operationId'])
        assert any(code.startswith('2') for code in operation['responses'])
        assert '429' in operation['responses']


def test_documented_security_matches_route_guards(app, spec):
    for method, path, view in _routes(app):
        guards = frozenset(getattr(view, '__guards__', ()))
        operation = spec['paths'][path][method]
        if guards:
            assert operation['security'] == [{'cookieAuth': []}], (method, path)
            assert operation['description'].startswith('Accès :'), (method, path)
        else:
            assert operation['security'] == [], (method, path)
            assert (method, path) in PUBLIC_OPERATIONS, (
                '%s %s est publique sans être déclarée' % (method.upper(), path))


def test_mutations_document_csrf_header(app, spec):
    header = app.config['CSRF_HEADER_NAME']
    for method, path, view in _routes(app):
        if method not in MUTATING or not getattr(view, '__guards__', None):
            continue
        parameters = spec['paths'][path][method]['parameters']
        csrf = [p for p in parameters if p['name'] == header and p['in'] == 'header']
        assert csrf and csrf[0]['required'], (method, path)


def test_no_route_is_implicitly_public(app):
    for method, path, view in _routes(app):
        if method not in MUTATING:
            continue
        assert getattr(view, '__guards__', None) or (method, path) in PUBLIC_OPERATIONS, (
            '%s %s protège l\'écriture : décorateur de garde manquant'
            % (method.upper(), path))


def test_annotation_tables_match_live_routes(app, spec):
    endpoints = {rule.endpoint for rule in app.url_map.iter_rules()}
    for endpoint in CREATED | UPLOADS | set(BINARY):
        assert endpoint in endpoints, 'entrée orpheline : %s' % endpoint
    for method, path in QUERY_PARAMS:
        assert method.lower() in spec['paths'].get(path, {}), (method, path)


def test_docs_page(client):
    response = client.get('/api/docs')
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert '/api/openapi.json' in html
    assert 'swagger-ui-bundle.js' in html
    assert '/api/documents' in html
    assert 'https://unpkg.com' in response.headers['Content-Security-Policy']


def test_docs_csp_is_scoped_to_the_console(client):
    response = client.get('/api/openapi.json')
    assert 'unpkg.com' not in response.headers['Content-Security-Policy']
