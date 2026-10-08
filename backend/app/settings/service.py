"""Résolution des réglages : défaut → global → campus, avec cache."""

from __future__ import annotations

import json
from typing import Any, cast

from flask import current_app

from app.errors import NotFoundError, ValidationError
from app.models.campus import Campus
from app.models.setting import Setting
from app.settings.registry import REGISTRY, definition, SettingDefinition
from extensions import db

_CACHE_PREFIX = 'uniarchive:setting:'
_CACHE_TTL = 300

_redis_client = None
_redis_ready = False
_memory_cache: dict[str, Any] = {}


def _redis():
    global _redis_client, _redis_ready
    if _redis_ready:
        return _redis_client

    _redis_ready = True
    url = current_app.config.get('REDIS_URL')
    if not url:
        return None
    try:
        import redis
        client = redis.from_url(url, decode_responses=True)
        client.ping()
        _redis_client = client
    except Exception:
        _redis_client = None
    return _redis_client


def _cache_key(key: str, campus_id: int | None) -> str:
    return f'{_CACHE_PREFIX}{campus_id if campus_id is not None else "global"}:{key}'


def _cache_get(cache_key: str):
    client = _redis()
    if client is not None:
        raw = cast('str | bytes | None', client.get(cache_key))
        return json.loads(raw) if raw is not None else None
    entry = _memory_cache.get(cache_key)
    return entry[0] if entry is not None else None


def _cache_set(cache_key: str, value: Any) -> None:
    client = _redis()
    if client is not None:
        client.setex(cache_key, _CACHE_TTL, json.dumps(value))
    else:
        _memory_cache[cache_key] = (value, _CACHE_TTL)


def purge_cache() -> None:
    client = _redis()
    if client is not None:
        for key in client.scan_iter(match=f'{_CACHE_PREFIX}*', count=200):
            client.delete(key)
    _memory_cache.clear()


def validate(defn: SettingDefinition, value: Any) -> Any:
    def _reject(message: str):
        raise ValidationError(
            message,
            code='invalid_setting',
            details={'key': defn.key, 'expected': defn.type, 'received': value},
        )

    if defn.type == 'bool':
        if not isinstance(value, bool):
            _reject(f"Le réglage « {defn.key} » attend un booléen.")
        return value

    if defn.type == 'int':
        if isinstance(value, bool) or not isinstance(value, int):
            _reject(f"Le réglage « {defn.key} » attend un entier.")
        if defn.min is not None and value < defn.min:
            _reject(f"Le réglage « {defn.key} » doit être ≥ {defn.min}.")
        if defn.max is not None and value > defn.max:
            _reject(f"Le réglage « {defn.key} » doit être ≤ {defn.max}.")
        return value

    if defn.type == 'str':
        if not isinstance(value, str) or not value.strip():
            _reject(f"Le réglage « {defn.key} » attend une chaîne non vide.")
        return value.strip()

    if defn.type == 'choice':
        if value not in defn.choices:
            _reject(f"Le réglage « {defn.key} » attend une valeur parmi "
                    f"{', '.join(defn.choices)}.")
        return value

    if defn.type == 'list':
        if not isinstance(value, (list, tuple)):
            _reject(f"Le réglage « {defn.key} » attend une liste.")
        normalized = list(value)
        if not all(isinstance(item, str) for item in normalized):
            _reject(f"Le réglage « {defn.key} » attend une liste de chaînes.")
        return normalized

    _reject(f"Type de réglage inconnu pour « {defn.key} ».")


class SettingService:

    @staticmethod
    def effective(key: str, campus_id: int | None = None) -> Any:
        defn = definition(key)
        cache_key = _cache_key(key, campus_id)
        cached = _cache_get(cache_key)
        if cached is not None:
            return cached

        value = defn.default
        global_row = Setting.query.filter_by(key=key, scope='global').first()
        if global_row is not None:
            value = global_row.value
        if campus_id is not None:
            campus_row = Setting.query.filter_by(
                key=key, scope='campus', campus_id=campus_id
            ).first()
            if campus_row is not None:
                value = campus_row.value

        _cache_set(cache_key, value)
        return value

    @staticmethod
    def effective_many(campus_id: int | None = None,
                       keys: list[str] | None = None) -> dict[str, Any]:
        selected = keys if keys is not None else list(REGISTRY.keys())
        return {key: SettingService.effective(key, campus_id) for key in selected}

    @staticmethod
    def public_values(campus_id: int | None = None) -> dict[str, Any]:
        keys = [k for k, d in REGISTRY.items() if d.public]
        return SettingService.effective_many(campus_id, keys)

    @staticmethod
    def is_overridden(key: str, scope: str, campus_id: int | None = None) -> bool:
        query = Setting.query.filter_by(key=key, scope=scope)
        if scope == 'campus':
            query = query.filter_by(campus_id=campus_id)
        return query.first() is not None

    @staticmethod
    def set_value(key: str, value: Any, *, scope: str = 'global',
                  campus_id: int | None = None,
                  updated_by: int | None = None) -> Setting:
        if key not in REGISTRY:
            raise NotFoundError(
                f"Réglage inconnu : {key}",
                code='unknown_setting',
                details={'key': key},
            )
        defn = REGISTRY[key]

        if scope == 'global':
            campus_id = None
        elif scope == 'campus':
            if campus_id is None:
                raise ValidationError(
                    "Un réglage de portée « campus » exige un campus_id.",
                    code='missing_campus',
                    details={'key': key},
                )
            if Campus.query.get(campus_id) is None:
                raise NotFoundError(
                    f"Campus {campus_id} introuvable.",
                    code='campus_not_found',
                    details={'campus_id': campus_id},
                )
        else:
            raise ValidationError(
                "Portée invalide : attendu 'global' ou 'campus'.",
                code='invalid_scope',
                details={'scope': scope},
            )

        normalized = validate(defn, value)

        row = Setting.query.filter_by(key=key, scope=scope, campus_id=campus_id).first()
        if row is None:
            row = Setting(key=key, scope=scope, campus_id=campus_id)
            db.session.add(row)
        row.value = normalized
        row.updated_by = updated_by
        db.session.commit()
        purge_cache()
        return row

    @staticmethod
    def reset_value(key: str, *, scope: str = 'global',
                    campus_id: int | None = None) -> bool:
        if key not in REGISTRY:
            raise NotFoundError(f"Réglage inconnu : {key}", code='unknown_setting')
        if scope == 'campus' and campus_id is None:
            raise ValidationError("Campus requis.", code='missing_campus')

        query = Setting.query.filter_by(key=key, scope=scope)
        if scope == 'campus':
            query = query.filter_by(campus_id=campus_id)
        row = query.first()
        if row is None:
            return False
        db.session.delete(row)
        db.session.commit()
        purge_cache()
        return True

    @staticmethod
    def defaults() -> dict[str, Any]:
        return {key: defn.default for key, defn in REGISTRY.items()}
