"""
Points de contrôle système (plan07 — P0.4).
"""


def test_sante_de_l_application(client):
    resp = client.get('/health')

    assert resp.status_code == 200
    assert resp.get_json() == {'status': 'ok'}


def test_route_inconnue_renvoie_du_json(client):
    """404 : réponse JSON exploitable par le frontend (pas de page HTML)."""
    resp = client.get('/api/point-inexistant')

    assert resp.status_code == 404
    assert isinstance(resp.get_json()['error'], str)


def test_documents_exige_une_session(client):
    assert client.get('/api/documents').status_code == 401


def test_les_endpoints_p4_exigent_une_session(client):
    """Dashboard, recherche et notifications : 401 sans session (P4)."""
    for path in ('/api/dashboard/summary', '/api/dashboard/activity',
                 '/api/dashboard/expiring', '/api/dashboard/uploads',
                 '/api/dashboard/recent-documents',
                 '/api/search?q=test', '/api/search/history',
                 '/api/notifications', '/api/notifications/unread-count'):
        resp = client.get(path)
        assert resp.status_code == 401, (path, resp.status_code)
