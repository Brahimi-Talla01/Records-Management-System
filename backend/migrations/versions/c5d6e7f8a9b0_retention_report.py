"""Rétention : table des rapports + index des échéances (plan 07 — P5).

Idempotente : l'entrypoint exécute `create_all()` avant Alembic, donc sur une
base fraîche la table et l'index existent déjà et sont détectés par
introspection.

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-01
"""

import sqlalchemy as sa
from alembic import op

revision = 'c5d6e7f8a9b0'
down_revision = 'b4c5d6e7f8a9'
branch_labels = None
depends_on = None

INDEXES = [
    'CREATE INDEX IF NOT EXISTS ix_document_status_retention_expires_at '
    'ON document (status, retention_expires_at)',
    'CREATE INDEX IF NOT EXISTS ix_retention_report_ran_at '
    'ON retention_report (ran_at)',
]


def _index_name(statement: str) -> str:
    return statement.split('IF NOT EXISTS ')[1].split(' ON ')[0]


def drop_statements():
    return [f'DROP INDEX IF EXISTS {_index_name(s)}' for s in INDEXES]


def _has_table(inspector, name):
    return inspector.has_table(name)


def _create_table(inspector):
    if _has_table(inspector, 'retention_report'):
        return
    op.create_table(
        'retention_report',
        sa.Column('report_id', sa.Integer(), primary_key=True),
        sa.Column('ran_at', sa.DateTime(), nullable=False),
        sa.Column('dry_run', sa.Boolean(), nullable=False,
                  server_default=sa.false()),
        sa.Column('warnings_sent', sa.Integer(), nullable=False,
                  server_default='0'),
        sa.Column('archived', sa.Integer(), nullable=False,
                  server_default='0'),
        sa.Column('purged', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('triggered_by', sa.Integer(),
                  sa.ForeignKey('user_account.user_id', ondelete='SET NULL')),
        sa.Column('details', sa.JSON()),
    )


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    _create_table(inspector)

    for statement in INDEXES:
        op.execute(sa.text(statement))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for statement in drop_statements():
        op.execute(sa.text(statement))

    if _has_table(inspector, 'retention_report'):
        op.drop_table('retention_report')
