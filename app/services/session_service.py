"""
Service de sessions opaques.

Principe : le client ne stocke qu'un identifiant de session aléatoire
(cookie HTTPOnly). Toutes les données de session vivent côté serveur
(Redis en production, mémoire en dev/fallback).

Interface :
    create_session(user_id, ip, user_agent) -> dict(session_id, expires_at)
    get_session(session_id)                 -> dict | None (rafraîchit le TTL)
    revoke_session(session_id)              -> bool
    revoke_all_for_user(user_id)            -> int
    list_user_sessions(user_id)             -> list[dict]
    csrf token helpers
"""

import json
import secrets
import uuid
from datetime import datetime, timedelta

# =============================================================================
# Stockages
# =============================================================================


class BaseSessionStore:
    """Interface commune aux stores de sessions."""

    def set(self, session_id, payload, ttl_seconds):
        raise NotImplementedError

    def get(self, session_id):
        raise NotImplementedError

    def delete(self, session_id):
        raise NotImplementedError

    def list_for_user(self, user_id):
        raise NotImplementedError


class MemorySessionStore(BaseSessionStore):
    """Fallback dev/tests : sessions en mémoire process."""

    def __init__(self):
        self._data = {}      # session_id -> (payload dict, expires_at datetime)
        self._by_user = {}   # user_id -> set(session_id)

    def set(self, session_id, payload, ttl_seconds):
        expires = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        self._data[session_id] = (payload, expires)
        uid = payload.get('user_id')
        self._by_user.setdefault(uid, set()).add(session_id)

    def _alive(self, session_id):
        entry = self._data.get(session_id)
        if not entry:
            return None
        payload, expires = entry
        if datetime.utcnow() >= expires:
            self.delete(session_id)
            return None
        return payload

    def get(self, session_id):
        return self._alive(session_id)

    def delete(self, session_id):
        entry = self._data.pop(session_id, None)
        if entry:
            uid = entry[0].get('user_id')
            sessions = self._by_user.get(uid)
            if sessions:
                sessions.discard(session_id)
                if not sessions:
                    self._by_user.pop(uid, None)

    def list_for_user(self, user_id):
        out = []
        for sid in list(self._by_user.get(user_id, set())):
            payload = self._alive(sid)
            if payload:
                out.append({'session_id': sid, **payload})
        return out


class RedisSessionStore(BaseSessionStore):
    """Store de production : sessions dans Redis."""

    def __init__(self, redis_client, key_prefix='uniarchive:session:'):
        self._redis = redis_client
        self._prefix = key_prefix

    def _key(self, session_id):
        return f'{self._prefix}{session_id}'

    def set(self, session_id, payload, ttl_seconds):
        self._redis.setex(
            self._key(session_id),
            ttl_seconds,
            json.dumps(payload),
        )

    def get(self, session_id):
        raw = self._redis.get(self._key(session_id))
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            self.delete(session_id)
            return None

    def delete(self, session_id):
        self._redis.delete(self._key(session_id))

    def list_for_user(self, user_id):
        # Scan simple par préfixe : suffisant aux volumétries visées.
        out = []
        pattern = f'{self._prefix}*'
        for key in self._redis.scan_iter(match=pattern, count=200):
            try:
                raw = self._redis.get(key)
                if raw is None:
                    continue
                payload = json.loads(raw)
            except (TypeError, ValueError):
                continue
            if payload.get('user_id') == user_id:
                session_id = str(key).replace(self._prefix, '')
                out.append({'session_id': session_id, **payload})
        return out


# Store process-local, initialisé dans create_app()
session_store = None


def init_session_store(app):
    """Initialise le store de sessions selon la config (Redis ou mémoire)."""
    global session_store

    redis_url = app.config.get('REDIS_URL')
    if redis_url:
        try:
            import redis
            client = redis.from_url(redis_url, decode_responses=True)
            client.ping()
            session_store = RedisSessionStore(client)
            app.logger.info('Sessions : store Redis actif (%s)', redis_url)
            return session_store
        except Exception as exc:  # Redis indisponible -> fallback
            app.logger.warning(
                'Redis indisponible (%s), fallback mémoire pour les sessions', exc
            )

    session_store = MemorySessionStore()
    app.logger.info('Sessions : store mémoire actif (dev/fallback)')
    return session_store


# =============================================================================
# Logique de session (au-dessus du store)
# =============================================================================


def _new_csrf_token():
    return secrets.token_urlsafe(32)


def create_session(user_id, ip_address=None, user_agent=None, ttl_seconds=None):
    """Crée une session ; retourne (session_id, csrf_token, expires_at)."""
    from flask import current_app

    store = session_store
    if store is None:
        raise RuntimeError('Session store non initialisé (init_session_store)')

    ttl = ttl_seconds or current_app.config['SESSION_TTL_SECONDS']
    session_id = secrets.token_urlsafe(32)
    csrf_token = _new_csrf_token()

    payload = {
        'user_id': user_id,
        'created_at': datetime.utcnow().isoformat(),
        'last_seen': datetime.utcnow().isoformat(),
        'ip': ip_address,
        'user_agent': (user_agent or '')[:200],
        'csrf_token': csrf_token,
    }
    store.set(session_id, payload, ttl)
    return {
        'session_id': session_id,
        'csrf_token': csrf_token,
        'expires_at': (datetime.utcnow() + timedelta(seconds=ttl)).isoformat(),
    }


def get_session(session_id, refresh_ttl=True):
    """Retourne le payload de session, en rafraîchissant le TTL (glissant)."""
    from flask import current_app

    if not session_id:
        return None
    store = session_store
    if store is None:
        return None

    payload = store.get(session_id)
    if payload is None:
        return None

    if refresh_ttl:
        ttl = current_app.config['SESSION_TTL_SECONDS']
        payload['last_seen'] = datetime.utcnow().isoformat()
        store.set(session_id, payload, ttl)

    return payload


def revoke_session(session_id):
    if session_store and session_id:
        session_store.delete(session_id)
        return True
    return False


def revoke_all_for_user(user_id):
    """Révoque toutes les sessions d'un utilisateur ; retourne le nombre."""
    if session_store is None:
        return 0
    count = 0
    for entry in session_store.list_for_user(user_id):
        session_store.delete(entry['session_id'])
        count += 1
    return count


def list_user_sessions(user_id):
    if session_store is None:
        return []
    sessions = session_store.list_for_user(user_id)
    # Ne jamais exposer le csrf_token ni l'id brut hors de ce module
    return [
        {
            'session_id': s['session_id'][:8] + '…',
            'created_at': s.get('created_at'),
            'last_seen': s.get('last_seen'),
            'ip': s.get('ip'),
            'user_agent': s.get('user_agent'),
        }
        for s in sessions
    ]
