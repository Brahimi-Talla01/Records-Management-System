from __future__ import annotations

from typing import Any

from sqlalchemy import func

from app.errors import ConflictError, NotFoundError, ValidationError
from app.models.campus import Campus
from app.models.institution import Institution
from app.scope import is_super_admin, require_campus_access
from app.services import audit_service
from extensions import db


def _normalized_code(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError("Le code du campus est requis.",
                              code='missing_campus_code')
    return value.strip().upper()


def _normalized_name(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError("Le nom du campus est requis.",
                              code='missing_campus_name')
    return value.strip()


class InstitutionService:

    @staticmethod
    def get_profile() -> dict:
        institution = Institution.get()
        if institution is not None:
            return institution.to_dict()
        return {
            'institution_id': None,
            'name': 'Établissement',
            'short_name': None,
            'slogan': None,
            'address': None,
            'website': None,
            'email': None,
            'phone': None,
            'logo_url': None,
            'locale': 'fr',
            'timezone': 'Africa/Douala',
            'updated_at': None,
        }

    @staticmethod
    def update_profile(data: dict, actor) -> dict:
        if not isinstance(data, dict):
            raise ValidationError("Corps JSON attendu.", code='invalid_payload')

        institution = Institution.get()
        if institution is None:
            institution = Institution(institution_id=1)
            db.session.add(institution)

        fields = ('name', 'short_name', 'slogan', 'address', 'website',
                  'email', 'phone', 'logo_url', 'locale', 'timezone')
        for field in fields:
            if field in data:
                setattr(institution, field, data[field])

        if not institution.name:
            raise ValidationError("Le nom de l'établissement est requis.",
                                  code='missing_institution_name')

        db.session.commit()
        audit_service.log('institution_updated', 'institution',
                          object_id=institution.institution_id,
                          details={'fields': [f for f in fields if f in data]},
                          user_id=actor.user_id)
        return institution.to_dict()


class CampusService:

    @staticmethod
    def list_campuses(actor, active_only: bool = False) -> list[dict]:
        query = Campus.query
        if active_only:
            query = query.filter(Campus.is_active.is_(True))
        if not is_super_admin(actor):
            require_campus_access(actor, actor.campus_id)
            query = query.filter(Campus.campus_id == actor.campus_id)
        return [c.to_dict(include_stats=is_super_admin(actor))
                for c in query.order_by(Campus.name).all()]

    @staticmethod
    def get_campus(campus_id: int, actor) -> Campus:
        campus = Campus.query.get(campus_id)
        if campus is None:
            raise NotFoundError("Campus introuvable.", code='campus_not_found')
        require_campus_access(actor, campus.campus_id)
        return campus

    @staticmethod
    def create_campus(data: dict, actor) -> dict:
        code = _normalized_code(data.get('code'))
        name = _normalized_name(data.get('name'))

        existing = Campus.query.filter(func.lower(Campus.code) == code.lower()).first()
        if existing is not None:
            raise ConflictError(
                f"Le code campus « {code} » est déjà utilisé.",
                code='campus_code_exists', details={'code': code},
            )

        campus = Campus(
            code=code,
            name=name,
            address=data.get('address'),
            city=data.get('city'),
            phone=data.get('phone'),
            email=data.get('email'),
            is_active=bool(data.get('is_active', True)),
        )
        db.session.add(campus)
        db.session.commit()
        audit_service.log('campus_created', 'campus', object_id=campus.campus_id,
                          details={'code': code, 'name': name},
                          user_id=actor.user_id)
        return campus.to_dict(include_stats=True)

    @staticmethod
    def update_campus(campus_id: int, data: dict, actor) -> dict:
        campus = Campus.query.get(campus_id)
        if campus is None:
            raise NotFoundError("Campus introuvable.", code='campus_not_found')

        if 'code' in data:
            code = _normalized_code(data['code'])
            duplicate = Campus.query.filter(
                func.lower(Campus.code) == code.lower(),
                Campus.campus_id != campus_id,
            ).first()
            if duplicate is not None:
                raise ConflictError(
                    f"Le code campus « {code} » est déjà utilisé.",
                    code='campus_code_exists', details={'code': code},
                )
            campus.code = code
        if 'name' in data:
            campus.name = _normalized_name(data['name'])
        for field in ('address', 'city', 'phone', 'email'):
            if field in data:
                setattr(campus, field, data[field])

        db.session.commit()
        audit_service.log('campus_updated', 'campus', object_id=campus.campus_id,
                          details={'fields': [f for f in data if f != 'code']},
                          user_id=actor.user_id)
        return campus.to_dict(include_stats=True)

    @staticmethod
    def set_status(campus_id: int, is_active: bool, actor) -> dict:
        campus = Campus.query.get(campus_id)
        if campus is None:
            raise NotFoundError("Campus introuvable.", code='campus_not_found')

        if not is_active:
            stats = campus.stats()
            blocking = {k: v for k, v in stats.items() if v > 0}
            if blocking:
                raise ConflictError(
                    "Impossible de désactiver : des données sont rattachées à ce campus.",
                    code='campus_not_empty', details=blocking,
                )

        campus.is_active = bool(is_active)
        db.session.commit()
        audit_service.log('campus_status_changed', 'campus',
                          object_id=campus.campus_id,
                          details={'is_active': campus.is_active},
                          user_id=actor.user_id)
        return campus.to_dict(include_stats=True)

    @staticmethod
    def delete_campus(campus_id: int, actor) -> None:
        campus = Campus.query.get(campus_id)
        if campus is None:
            raise NotFoundError("Campus introuvable.", code='campus_not_found')
        raise ConflictError(
            "Suppression interdite : désactivez le campus (PATCH …/status).",
            code='campus_deletion_forbidden',
            details={'campus_id': campus.campus_id, 'stats': campus.stats()},
        )
