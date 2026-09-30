"""
Store de sessions Redis (plan 07 — P0.7).

Le store Redis est celui de la production : la suite doit le vérifier au moins
une fois contre un vrai `redis:7`. Le test est donc :

* **actif** en CI (`TEST_REDIS_URL` défini sur le service Redis) ;
* **skippé** localement tant que `TEST_REDIS_URL` n'est pas défini, pour ne pas
  imposer un Redis à toute la suite.

    TEST_REDIS_URL=redis://127.0.0.1:6379/0 pytest tests/test_session_redis.py

`app/services/session_service.py` ne dépend pas de Flask ici : on teste le
store lui-même (la logique « au-dessus du store » est couverte par la suite
d'authentification, qui passe, elle, par le store mémoire).
"""

import os
import uuid

import pytest

from app.services.session_service import RedisSessionStore

REDIS_URL = os.environ.get('TEST_REDIS_URL')
PREFIX = 'uniarchive:session:'

pytestmark = pytest.mark.skipif(
    not REDIS_URL,
    reason='TEST_REDIS_URL absent : Redis non demandé (skippé en local)',
)


@pytest.fixture
def redis_client():
    import redis
    client = redis.from_url(REDIS_URL, decode_responses=True)
    client.ping()
    client.flushdb()
    yield client
    client.flushdb()


@pytest.fixture
def store(redis_client):
    return RedisSessionStore(redis_client)


def test_set_puis_get_restitue_le_payload(store):
    session_id = uuid.uuid4().hex
    payload = {'user_id': 42, 'csrf_token': 'x' * 43, 'ip': '127.0.0.1'}

    store.set(session_id, payload, ttl_seconds=60)

    assert store.get(session_id) == payload


def test_get_sur_session_inconnue_renvoie_none(store):
    assert store.get('jamais-creee') is None


def test_le_ttl_est_posé_sur_la_clé(store, redis_client):
    session_id = uuid.uuid4().hex

    store.set(session_id, {'user_id': 1}, ttl_seconds=120)

    ttl = redis_client.ttl(f'{PREFIX}{session_id}')
    assert 0 < ttl <= 120


def test_delete_retire_la_session(store, redis_client):
    session_id = uuid.uuid4().hex
    store.set(session_id, {'user_id': 7}, ttl_seconds=60)

    assert store.delete(session_id) is None  # suppression silencieuse
    assert store.get(session_id) is None
    assert redis_client.exists(f'{PREFIX}{session_id}') == 0


def test_list_for_user_ne_retient_que_ses_sessions(store):
    store.set('aaa', {'user_id': 1, 'ip': '10.0.0.1'}, ttl_seconds=60)
    store.set('bbb', {'user_id': 1, 'ip': '10.0.0.2'}, ttl_seconds=60)
    store.set('ccc', {'user_id': 2, 'ip': '10.0.0.3'}, ttl_seconds=60)

    sessions = store.list_for_user(1)

    assert {s['session_id'] for s in sessions} == {'aaa', 'bbb'}
    assert all(s['user_id'] == 1 for s in sessions)


def test_payload_corrompu_est_supprimé_et_ignoré(store, redis_client):
    """Un JSON illisible ne doit pas faire échouer la lecture : la clé part à la poubelle."""
    session_id = uuid.uuid4().hex
    redis_client.set(f'{PREFIX}{session_id}', '{pas-du-json')

    assert store.get(session_id) is None
    assert redis_client.exists(f'{PREFIX}{session_id}') == 0


def test_list_for_user_saute_les_payloads_corrompus(store, redis_client):
    store.set('valide', {'user_id': 9}, ttl_seconds=60)
    redis_client.set(f'{PREFIX}corrompu', '{pas-du-json')

    sessions = store.list_for_user(9)

    assert [s['session_id'] for s in sessions] == ['valide']
