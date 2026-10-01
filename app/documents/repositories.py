from datetime import datetime
from typing import Any, cast

from sqlalchemy import or_
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


class DocumentRepository:

    @staticmethod
    def base_query():
        return Document.query.options(
            joinedload(cast(Any, Document.department)),
            joinedload(cast(Any, Document.doc_type)),
            joinedload(cast(Any, Document.folder)),
        )

    @staticmethod
    def search(filters, page=1, per_page=20):
        filters = filters or {}
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

        sort = filters.get('sort') or 'created_at'
        column = SORTABLE.get(sort, Document.created_at)
        if filters.get('order') == 'asc':
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())

        return query.paginate(page=page, per_page=per_page, error_out=False)

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
