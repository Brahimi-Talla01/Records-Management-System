"""Recherche de documents (plan 07 — P4, §4.5).

Deux moteurs, contrat identique :

* PostgreSQL — `websearch_to_tsquery('french')` sur `document.search_vector`
  (trigger, poids A/B/C) complété par `pg_trgm` sur le titre (tolérance aux
  fautes), tri par pertinence (`ts_rank`) et extrait surligné (`ts_headline`) ;
* autres dialectes (SQLite des tests) — `ILIKE` sur titre + description,
  tri par date, extrait découpé autour de la première occurrence.

Périmètre : même règle que la liste documents (D6) — filtrage par campus au
niveau service ; les droits fins par document restent appliqués à la fiche.
"""

from __future__ import annotations

import time
from datetime import datetime

from sqlalchemy import func, or_

from app.documents.repositories import parse_date
from app.errors import PermissionDeniedError
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.document_tag import document_tag
from app.models.search_history import SearchHistory
from app.scope import is_super_admin
from app.serializers import parse_pagination
from extensions import db

TRIGRAM_THRESHOLD = 0.3
HIGHLIGHT_OPTIONS = ('StartSel=<mark>, StopSel=</mark>, '
                     'MaxFragments=2, MaxWords=35, MinWords=15')


def _int(params, key, default=None):
    value = params.get(key)
    if value in (None, ''):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class SearchService:

    @staticmethod
    def is_postgres() -> bool:
        return db.engine.dialect.name == 'postgresql'

    @staticmethod
    def _filters(actor, params) -> dict:
        filters = {
            'q': (params.get('q') or '').strip(),
            'folder_id': _int(params, 'folder_id'),
            'department_id': _int(params, 'department_id'),
            'doc_type_id': _int(params, 'doc_type_id'),
            'status': params.get('status') or 'active',
            'confidentiality': params.get('confidentiality') or None,
            'created_from': parse_date(params.get('date_from')
                                       or params.get('created_from')),
            'created_to': parse_date(params.get('date_to')
                                     or params.get('created_to')),
            'tag_ids': None,
        }
        tag_ids = params.get('tag_ids')
        if tag_ids:
            filters['tag_ids'] = [int(t) for t in str(tag_ids).split(',')
                                  if t.strip()]

        if is_super_admin(actor):
            filters['campus_id'] = _int(params, 'campus_id')
        else:
            if actor.campus_id is None:
                raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                            code='no_campus_scope')
            requested = _int(params, 'campus_id')
            if requested is not None and requested != actor.campus_id:
                raise PermissionDeniedError("Accès inter-campus interdit.",
                                            code='cross_campus_access')
            filters['campus_id'] = actor.campus_id
        return filters

    @staticmethod
    def _apply_filters(query, filters):
        if filters.get('campus_id') is not None:
            query = query.filter(Document.campus_id == filters['campus_id'])
        if filters.get('folder_id') is not None:
            query = query.filter(Document.folder_id == filters['folder_id'])
        if filters.get('department_id') is not None:
            query = query.filter(Document.department_id == filters['department_id'])
        if filters.get('doc_type_id') is not None:
            query = query.filter(Document.doc_type_id == filters['doc_type_id'])
        if filters.get('status'):
            query = query.filter(Document.status == filters['status'])
        if filters.get('confidentiality'):
            query = query.filter(
                Document.confidentiality_level == filters['confidentiality'])
        if filters.get('created_from'):
            query = query.filter(Document.created_at >= filters['created_from'])
        if filters.get('created_to'):
            query = query.filter(Document.created_at <= filters['created_to'])
        if filters.get('tag_ids'):
            query = query.join(
                document_tag,
                Document.document_id == document_tag.c.document_id,
            ).filter(document_tag.c.tag_id.in_(filters['tag_ids']))
        return query

    @staticmethod
    def _text_condition(q: str):
        """(condition, rank | None, tsquery | None) selon le dialecte."""
        if SearchService.is_postgres():
            tsquery = func.websearch_to_tsquery('french', q)
            condition = or_(
                Document.search_vector.op('@@')(tsquery),
                func.similarity(Document.title, q) > TRIGRAM_THRESHOLD,
            )
            rank = func.ts_rank(Document.search_vector, tsquery)
            return condition, rank, tsquery

        pattern = f"%{q}%"
        return (or_(Document.title.ilike(pattern),
                    Document.description.ilike(pattern),
                    Document.ocr_text.ilike(pattern)), None, None)

    @staticmethod
    def _headline(tsquery):
        return func.ts_headline(
            'french',
            func.coalesce(Document.description, Document.title),
            tsquery,
            HIGHLIGHT_OPTIONS,
        )

    @staticmethod
    def _fallback_snippet(document, q: str) -> str:
        candidates = (document.description, document.title, document.ocr_text)
        text = next((value for value in candidates
                     if value and q.lower() in value.lower()),
                    document.description or document.title or '')
        position = text.lower().find(q.lower())
        if position < 0:
            return text[:160]
        start = max(position - 60, 0)
        end = min(position + len(q) + 80, len(text))
        match = text[position:position + len(q)]
        fragment = text[start:position] + f"<mark>{match}</mark>" + \
            text[position + len(q):end]
        prefix = '…' if start > 0 else ''
        suffix = '…' if end < len(text) else ''
        return f"{prefix}{fragment}{suffix}"

    @staticmethod
    def _facet(base_query, column, model, pk: str, label: str) -> list[dict]:
        rows = (base_query.with_entities(column, func.count(Document.document_id))
                .group_by(column).all())
        ids = [row[0] for row in rows if row[0] is not None]
        labels = {}
        if ids:
            labels = {getattr(item, pk): getattr(item, label)
                      for item in model.query.filter(
                          getattr(model, pk).in_(ids)).all()}
        return [{'id': row[0], 'label': labels.get(row[0]), 'count': row[1]}
                for row in rows if row[0] is not None]

    @staticmethod
    def _value_facet(base_query, column) -> list[dict]:
        rows = (base_query.with_entities(column, func.count(Document.document_id))
                .group_by(column).all())
        return [{'value': row[0], 'count': row[1]} for row in rows
                if row[0] is not None]

    @staticmethod
    def _facets(filters: dict, text_condition) -> dict:
        base = SearchService._apply_filters(Document.query, filters)
        if text_condition is not None:
            base = base.filter(text_condition)
        return {
            'doc_types': SearchService._facet(
                base, Document.doc_type_id, DocType, 'doc_type_id', 'name'),
            'departments': SearchService._facet(
                base, Document.department_id, Department,
                'department_id', 'name'),
            'statuses': SearchService._value_facet(base, Document.status),
            'confidentialities': SearchService._value_facet(
                base, Document.confidentiality_level),
        }

    @staticmethod
    def _history_payload(filters: dict) -> dict:
        payload = {}
        for key, value in filters.items():
            if key == 'q' or value is None:
                continue
            payload[key] = value.isoformat() if isinstance(value, datetime) else value
        return payload

    @staticmethod
    def _record_history(user_id: int, q: str, filters: dict, total: int) -> None:
        payload = SearchService._history_payload(filters)
        last = (SearchHistory.query
                .filter(SearchHistory.user_id == user_id,
                        SearchHistory.search_query == q)
                .order_by(SearchHistory.searched_at.desc()).first())
        if last is not None and last.filters == payload:
            last.results_count = total
            last.searched_at = datetime.utcnow()
        else:
            db.session.add(SearchHistory(
                user_id=user_id, search_query=q, filters=payload,
                results_count=total))
        db.session.commit()

    @staticmethod
    def search(actor, params) -> dict:
        started = time.perf_counter()
        filters = SearchService._filters(actor, params)
        q = filters['q']

        text_condition = None
        rank = None
        tsquery = None
        if q:
            text_condition, rank, tsquery = SearchService._text_condition(q)

        query = SearchService._apply_filters(Document.query, filters)
        if text_condition is not None:
            query = query.filter(text_condition)

        total = query.count()
        page, per_page = parse_pagination(params)

        postgres = bool(q) and SearchService.is_postgres()
        if postgres and rank is not None and tsquery is not None:
            query = query.add_column(rank).add_column(
                SearchService._headline(tsquery))
            query = query.order_by(rank.desc(), Document.created_at.desc())
        else:
            query = query.order_by(Document.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        items = []
        for row in pagination.items:
            document = row[0] if postgres else row
            data = document.to_dict()
            if q:
                data['snippet'] = (row[2] if postgres
                                   else SearchService._fallback_snippet(document, q))
            items.append(data)

        if q:
            SearchService._record_history(actor.user_id, q, filters, total)

        return {
            'items': items,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': total,
            'pages': max((total + per_page - 1) // per_page, 1),
            'q': q,
            'engine': 'postgres_fulltext' if postgres else 'sql_ilike',
            'facets': SearchService._facets(filters, text_condition),
            'took_ms': round((time.perf_counter() - started) * 1000, 1),
        }

    @staticmethod
    def history(user_id: int, page: int, per_page: int) -> dict:
        query = (SearchHistory.query.filter_by(user_id=user_id)
                 .order_by(SearchHistory.searched_at.desc()))
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            'items': [h.to_dict() for h in pagination.items],
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
        }

    @staticmethod
    def clear_history(user_id: int) -> int:
        deleted = (SearchHistory.query
                   .filter_by(user_id=user_id)
                   .delete(synchronize_session=False))
        db.session.commit()
        return deleted
