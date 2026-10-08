"""Points de contrôle système P5 : readiness Docker et version déployée."""


def test_readiness_ok(client):
    resp = client.get('/health/ready')

    assert resp.status_code == 200
    body = resp.get_json()
    assert body['status'] == 'ready'
    assert body['checks']['database'] == 'ok'
    assert body['checks']['redis'] == 'skipped'  # pas de REDIS_URL en test


def test_readiness_degradee_si_la_base_est_hors_service(app, client,
                                                        monkeypatch):
    """La base ne répond plus → 503 « degraded », jamais une 200 optimiste."""
    from sqlalchemy.orm import Session

    def unavailable(self, *args, **kwargs):
        raise RuntimeError("base injoignable")

    monkeypatch.setattr(Session, "execute", unavailable)

    resp = client.get('/health/ready')

    assert resp.status_code == 503
    body = resp.get_json()
    assert body['status'] == 'degraded'
    assert body['checks']['database'] == 'error'


def test_version_par_defaut(client):
    resp = client.get('/api/version')

    assert resp.status_code == 200
    body = resp.get_json()
    assert body['version'] == '1.0.0'
    assert body['commit'] == 'unknown'
    assert body['build_date'] is None


def test_version_depuis_lenvironnement(app, client, monkeypatch):
    monkeypatch.setenv('APP_VERSION', '1.5.0')
    monkeypatch.setenv('GIT_COMMIT', 'abc1234')
    monkeypatch.setenv('APP_BUILD_DATE', '2026-10-01')

    resp = client.get('/api/version')

    assert resp.status_code == 200
    assert resp.get_json() == {'version': '1.5.0', 'commit': 'abc1234',
                               'build_date': '2026-10-01'}
