"""
Enveloppe d'erreur standardisée (plan 07 — P0.4).

Contrat vérifié partout : `{"error": str, "code": "SNAKE_CASE", "details": {…}}`
et jamais de page HTML (404/405) ni d'erreur avalée en 500.
"""

from app.errors import (
    AppError,
    ConflictError,
    NotFoundError,
    ValidationError,
    code_for_status,
    complete_error_envelope,
    envelope,
    error_response,
)


def assert_envelope(body, status=None):
    """Vérifie la forme complète de l'enveloppe et renvoie `code`."""
    assert set(body) >= {'error', 'code', 'details'}, body
    assert isinstance(body['error'], str) and body['error'], body
    assert isinstance(body['code'], str) and body['code'].islower(), body
    assert isinstance(body['details'], dict), body
    if status is not None:
        assert body['code'] == code_for_status(status), body
    return body['code']


# ---------------------------------------------------------------------------
# Unitaires
# ---------------------------------------------------------------------------


def test_envelope_a_toujours_les_trois_cles():
    assert envelope('Oups', 418) == {
        'error': 'Oups', 'code': 'error', 'details': {},
    }


def test_code_pour_statut():
    assert code_for_status(404) == 'not_found'
    assert code_for_status(413) == 'payload_too_large'
    assert code_for_status(599) == 'error'  # statut inconnu


def test_exception_métier_de_vient_enveloppe():
    err = ValidationError('Champ email manquant', details={'fields': ['email']})

    body = err.to_dict()

    assert body == {
        'error': 'Champ email manquant',
        'code': 'validation_error',
        'details': {'fields': ['email']},
    }
    assert err.status_code == 400
    assert isinstance(err, AppError)


def test_exceptions_par_defaut():
    assert NotFoundError().status_code == 404
    assert ConflictError().to_dict()['code'] == 'conflict'
    assert str(ValidationError('abc')) == 'abc'


def test_error_response_renvoie_tuple_json():
    response, status = error_response('Non trouvé', 404)

    assert status == 404
    assert response.get_json() == {
        'error': 'Non trouvé', 'code': 'not_found', 'details': {},
    }


def test_normalisation_complete_et_est_idempotente(app):
    response = app.response_class(
        '{"error": "Message"}', status=404, mimetype='application/json')

    once = complete_error_envelope(response).get_json()
    twice = complete_error_envelope(response).get_json()

    assert once == {'error': 'Message', 'code': 'not_found', 'details': {}}
    assert twice == once


def test_normalisation_ignore_les_reussites(app):
    response = app.response_class(
        '{"status": "ok"}', status=200, mimetype='application/json')

    assert complete_error_envelope(response).get_json() == {'status': 'ok'}


def test_normalisation_ignore_le_non_json(app):
    response = app.response_class('<html></html>', status=500)

    assert complete_error_envelope(response).get_data(as_text=True) == '<html></html>'


# ---------------------------------------------------------------------------
# Sur HTTP
# ---------------------------------------------------------------------------


def test_404_route_inconnue(client):
    resp = client.get('/api/une-route-qui-nexiste-pas')

    assert resp.status_code == 404
    assert resp.mimetype == 'application/json'  # pas de page HTML
    assert assert_envelope(resp.get_json(), 404) == 'not_found'


def test_405_methode_non_supportee(client):
    resp = client.get('/api/auth/login')  # route réservée à POST

    assert resp.status_code == 405
    assert assert_envelope(resp.get_json(), 405) == 'method_not_allowed'


def test_401_sans_session(client):
    resp = client.get('/api/auth/me')

    assert resp.status_code == 401
    assert assert_envelope(resp.get_json(), 401) == 'unauthorized'
    assert resp.get_json()['error'] == 'Authentification requise'


def test_403_acces_reserve_aux_admins(student):
    resp = student.delete('/api/users/1')

    assert resp.status_code == 403
    assert assert_envelope(resp.get_json(), 403) == 'forbidden'


def test_403_csrf_manquant(admin):
    resp = admin.without_csrf().post('/api/auth/logout')

    assert resp.status_code == 403
    assert assert_envelope(resp.get_json(), 403) == 'forbidden'


def test_400_corps_json_invalide(client):
    resp = client.post('/api/auth/login',
                       data='{json-incomplet',
                       content_type='application/json')

    assert resp.status_code == 400
    assert assert_envelope(resp.get_json(), 400) == 'bad_request'


def test_413_corps_trop_volumineux(app, client):
    """MAX_CONTENT_LENGTH (50 Mo en prod) doit produire 413, pas 500."""
    saved = app.config['MAX_CONTENT_LENGTH']
    app.config['MAX_CONTENT_LENGTH'] = 1024
    try:
        resp = client.post('/api/auth/login',
                           data=b'x' * 2048,
                           content_type='application/json')
    finally:
        app.config['MAX_CONTENT_LENGTH'] = saved

    assert resp.status_code == 413
    assert assert_envelope(resp.get_json(), 413) == 'payload_too_large'


def test_415_content_type_non_json(client):
    resp = client.post('/api/auth/login',
                       data='username=admin',
                       content_type='application/x-www-form-urlencoded')

    assert resp.status_code == 415
    assert assert_envelope(resp.get_json(), 415) == 'unsupported_media_type'


def test_erreur_de_route_legacy_normalisee(client):
    """Réponse `jsonify({'error': …})` brute : le code est injecté après coup."""
    resp = client.post('/api/auth/login',
                       json={'username': 'admin', 'password': 'Mauvais@123'})

    assert resp.status_code == 401
    assert assert_envelope(resp.get_json(), 401) == 'unauthorized'
    assert resp.get_json()['error'] == 'Identifiants invalides'


def test_reponse_de_succes_inchangee(admin):
    """Le normaliseur ne doit jamais toucher un 2xx."""
    resp = admin.get('/api/auth/me')

    assert resp.status_code == 200
    body = resp.get_json()
    assert 'code' not in body and 'details' not in body
    assert body['username'] == 'admin'
