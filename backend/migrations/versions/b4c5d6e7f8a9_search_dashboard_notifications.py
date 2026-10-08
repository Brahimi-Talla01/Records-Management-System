"""Recherche full-text et index de notifications (plan 07 — P4).

Idempotente : l'entrypoint exécute `create_all()` avant Alembic, donc sur une
base fraîche les index portables existent déjà et sont détectés par
introspection.

* portable : index composites `notification` / `search_history` ;
* PostgreSQL uniquement : colonne `document.search_vector` (tsvector, poids
  A=title B=description C=ocr_text), trigger de mise à jour, index GIN
  (tsvector + pg_trgm sur le titre). SQLite (tests) utilise le fallback
  ILIKE du service de recherche.

Revision ID: b4c5d6e7f8a9
Revises: f1a2b3c4d5e6
Create Date: 2026-10-01
"""

import sqlalchemy as sa
from alembic import op

revision = 'b4c5d6e7f8a9'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None

INDEXES = [
    'CREATE INDEX IF NOT EXISTS ix_notification_user_is_read_created_at '
    'ON notification (user_id, is_read, created_at)',
    'CREATE INDEX IF NOT EXISTS ix_search_history_user_searched_at '
    'ON search_history (user_id, searched_at)',
]

PG_DDL = [
    'CREATE EXTENSION IF NOT EXISTS pg_trgm',
    'ALTER TABLE document ADD COLUMN IF NOT EXISTS search_vector TSVECTOR',
    "UPDATE document SET search_vector = "
    " setweight(to_tsvector('french', coalesce(title, '')), 'A') || "
    " setweight(to_tsvector('french', coalesce(description, '')), 'B') || "
    " setweight(to_tsvector('french', coalesce(ocr_text, '')), 'C') "
    "WHERE search_vector IS NULL",
    """CREATE OR REPLACE FUNCTION document_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(NEW.ocr_text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql""",
    'DROP TRIGGER IF EXISTS trg_document_search_vector ON document',
    """CREATE TRIGGER trg_document_search_vector
BEFORE INSERT OR UPDATE OF title, description, ocr_text ON document
FOR EACH ROW EXECUTE FUNCTION document_search_vector_update()""",
    'CREATE INDEX IF NOT EXISTS ix_document_search_vector '
    'ON document USING GIN (search_vector)',
    'CREATE INDEX IF NOT EXISTS ix_document_title_trgm '
    'ON document USING GIN (title gin_trgm_ops)',
]

PG_DOWNGRADE = [
    'DROP INDEX IF EXISTS ix_document_title_trgm',
    'DROP INDEX IF EXISTS ix_document_search_vector',
    'DROP TRIGGER IF EXISTS trg_document_search_vector ON document',
    'DROP FUNCTION IF EXISTS document_search_vector_update()',
    'ALTER TABLE document DROP COLUMN IF EXISTS search_vector',
]


def _index_name(statement: str) -> str:
    return statement.split('IF NOT EXISTS ')[1].split(' ON ')[0]


def drop_statements():
    return [f'DROP INDEX IF EXISTS {_index_name(s)}' for s in INDEXES]


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    for statement in INDEXES:
        op.execute(sa.text(statement))

    if dialect == 'postgresql':
        for statement in PG_DDL:
            op.execute(sa.text(statement))


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'postgresql':
        for statement in PG_DOWNGRADE:
            op.execute(sa.text(statement))

    for statement in drop_statements():
        op.execute(sa.text(statement))
