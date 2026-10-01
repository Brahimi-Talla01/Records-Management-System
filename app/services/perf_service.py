"""
Plan d'exécution des requêtes lourdes (§7.5.4 — P6 du plan 07).

Dix requêtes représentatives de la charge (listing, recherche plein texte,
facettes, échéances de rétention, journal d'audit, notifications, historique)
soumises à `EXPLAIN ANALYZE` sur PostgreSQL et `EXPLAIN QUERY PLAN` sur SQLite.
La sortie sert de référence : chaque accès doit passer par un index, sinon un
index complémentaire est à ajouter (migration dédiée).

    flask perf explain           # lecture humaine
    flask perf explain --json    # diffable / CI
"""

from __future__ import annotations

import logging

from sqlalchemy import Select, func, select, text

from app.models.audit import AuditLog
from app.models.document import Document
from app.models.document_tag import document_tag
from app.models.notification import Notification
from app.search.services import SearchService
from extensions import db

logger = logging.getLogger(__name__)


def heavy_queries() -> list[tuple[str, Select]]:
    """Les 10 requêtes suivies, dans un ordre stable (sortie CLI et tests)."""
    text_condition, _, _ = SearchService._text_condition('rapport')
    return [
        ('documents : listing par campus et statut',
         select(Document).where(Document.status == 'active')
         .order_by(Document.created_at.desc()).limit(20)),
        ('documents : filtre dossier, tri titre',
         select(Document).where(Document.status == 'active',
                                Document.folder_id.is_not(None))
         .order_by(Document.title.asc()).limit(20)),
        ('documents : plein texte (pertinence)',
         select(Document).where(text_condition)
         .order_by(Document.created_at.desc()).limit(20)),
        ('documents : comptage plein texte',
         select(func.count()).select_from(Document).where(text_condition)),
        ('documents : facettes par type',
         select(Document.doc_type_id, func.count())
         .where(Document.status == 'active')
         .group_by(Document.doc_type_id)),
        ('documents : échéances de rétention',
         select(Document.document_id, Document.retention_expires_at)
         .where(Document.status == 'active',
                Document.retention_expires_at.is_not(None))
         .order_by(Document.retention_expires_at.asc()).limit(100)),
        ('documents : filtre tag',
         select(Document)
         .join(document_tag, Document.document_id == document_tag.c.document_id)
         .order_by(Document.created_at.desc()).limit(20)),
        ('audit : journal récent',
         select(AuditLog).order_by(AuditLog.created_at.desc()).limit(50)),
        ('audit : comptage par action',
         select(AuditLog.action, func.count()).group_by(AuditLog.action)),
        ('notifications : non lues',
         select(func.count()).select_from(Notification)
         .where(Notification.is_read.is_(False))),
    ]


def explain() -> list[dict]:
    """Plan d'exécution des 10 requêtes (`{'query', 'plan', 'error'?}` chacune)."""
    dialect = db.engine.dialect
    prefix = 'EXPLAIN ANALYZE ' if dialect.name == 'postgresql' \
        else 'EXPLAIN QUERY PLAN '
    results = []
    for name, statement in heavy_queries():
        entry: dict = {'query': name, 'plan': []}
        try:
            compiled = statement.compile(
                dialect=dialect, compile_kwargs={'literal_binds': True})
            rows = db.session.execute(text(prefix + str(compiled))).fetchall()
            entry['plan'] = [' | '.join(str(cell) for cell in row) for row in rows]
        except Exception as exc:  # une requête défaillante n'arrête pas le reste
            logger.warning('EXPLAIN impossible pour « %s » : %s', name, exc)
            entry['error'] = str(exc)
        results.append(entry)
    return results
