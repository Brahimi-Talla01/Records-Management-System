import base64
import binascii
import json
from datetime import datetime
from typing import Any, cast

from sqlalchemy import and_, or_
from sqlalchemy.orm import joinedload

from app.models.document import Document
from app.models.document_tag import document_tag
from extensions import db

SORTABLE = {
    'created_at': Document.created_at,
    'updated_at': Document.updated_at,
    'title': Document.title,
    'size_bytes': Document.size_bytes,
}

# Colonnes NOT NULL : seules elles acceptent une comparaison stricte de clé
# (`size_bytes` est nullable → NULL ne se compare pas de façon portable).
KEYSET_SORTS = frozenset({'created_at', 'updated_at', 'title'})
_TEMPORAL_SORTS = frozenset({'created_at', 'updated_at'})


class DocumentRepository:

    @staticmethod
    def base_query():
        return Document.query.options(
            joinedload(cast(Any, Document.department)),
            joinedload(cast(Any, Document.doc_type)),
            joinedload(cast(Any, Document.folder)),
        )

    @staticmethod
    def _filtered(filters):
        query = DocumentRepository.base_query()

        if filters.get('campus_id') is not None:
            query = query.filter(Document.campus_id == filters['campus_id'])
        if filters.get('q'):
            pattern = f"%{filters['q']}%"
            query = query.filter(or_(Document.title.ilike(pattern),
                                     Document.description.ilike(pattern)))
        if filters.get('folder_id') is not None:
            query = query.filter(Document.folder_id == filters['folder_id'])
        if filters.get('department_id') is not None:
            query = query.filter(Document.department_id == filters['department_id'])
        if filters.get('doc_type_id') is not None:
            query = query.filter(Document.doc_type_id == filters['doc_type_id'])
        if filters.get('status'):
            query = query.filter(Document.status == filters['status'])
        if filters.get('confidentiality'):
            query = query.filter(Document.confidentiality_level == filters['confidentiality'])
        if filters.get('created_from'):
            query = query.filter(Document.created_at >= filters['created_from'])
        if filters.get('created_to'):
            query = query.filter(Document.created_at <= filters['created_to'])
        if filters.get('tag_ids'):
            query = query.join(document_tag,
                               Document.document_id == document_tag.c.document_id).filter(
                document_tag.c.tag_id.in_(filters['tag_ids']))
        return query

    @staticmethod
    def search(filters, page=1, per_page=20):
        filters = filters or {}
        query = DocumentRepository._filtered(filters)

        sort = filters.get('sort') or 'created_at'
        column = SORTABLE.get(sort, Document.created_at)
        if filters.get('order') == 'asc':
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())

        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def search_after(filters, per_page, after=None):
        """Pagination clé (§7.5.4) : `WHERE (colonne, id) < dernier` + `LIMIT n+1`.

        Ni `COUNT(*)` (pour `total`) ni décalage à parcourir : le coût d'une page
        est indépendant de sa position dans la liste.
        """
        filters = filters or {}
        query = DocumentRepository._filtered(filters)
        sort = filters.get('sort') or 'created_at'
        column = SORTABLE[sort]
        descending = filters.get('order') != 'asc'

        if after is not None:
            value, last_id = after
            if descending:
                position = or_(column < value,
                               and_(column == value,
                                    Document.document_id < last_id))
            else:
                position = or_(column > value,
                               and_(column == value,
                                    Document.document_id > last_id))
            query = query.filter(position)

        if descending:
            query = query.order_by(column.desc(), Document.document_id.desc())
        else:
            query = query.order_by(column.asc(), Document.document_id.asc())

        rows = query.limit(per_page + 1).all()
        return rows[:per_page], len(rows) > per_page

    @staticmethod
    def get(document_id):
        return DocumentRepository.base_query().filter(
            Document.document_id == document_id).first()

    @staticmethod
    def by_ids(ids):
        if not ids:
            return []
        return DocumentRepository.base_query().filter(
            Document.document_id.in_(ids)).all()

    @staticmethod
    def add(document):
        db.session.add(document)

    @staticmethod
    def commit():
        db.session.commit()

    @staticmethod
    def rollback():
        db.session.rollback()


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def encode_cursor(row, sort: str, order: str) -> str:
    """Jeton opaque portant la dernière ligne vue + le tri qui l'a produite."""
    value = getattr(row, SORTABLE[sort].key)
    payload = {
        'sort': sort,
        'order': order,
        'value': value.isoformat() if isinstance(value, datetime) else value,
        'id': row.document_id,
    }
    raw = json.dumps(payload, ensure_ascii=False,
                     separators=(',', ':')).encode('utf-8')
    return base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')


def decode_cursor(raw: str, sort: str, order: str):
    """`(valeur, document_id)` ; `ValueError` si le jeton est illisible ou s'il
    provient d'un autre tri (page suivante après changement de tri/filtre)."""
    try:
        padded = raw + '=' * (-len(raw) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode('ascii')))
        value, last_id = payload['value'], int(payload['id'])
    except (ValueError, binascii.Error, KeyError, TypeError) as exc:
        raise ValueError('jeton illisible') from exc

    if payload.get('sort') != sort or payload.get('order') != order:
        raise ValueError('jeton émis pour un autre tri')

    if sort in _TEMPORAL_SORTS:
        try:
            value = datetime.fromisoformat(value)
        except (TypeError, ValueError) as exc:
            raise ValueError('jeton illisible') from exc
    return value, last_id
