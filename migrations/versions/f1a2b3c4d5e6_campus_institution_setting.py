"""Institution, campus et réglages (plan 07 — P1).

Idempotente : l'entrypoint exécute `create_all()` avant Alembic, donc sur une
base fraîche tables et colonnes existent déjà et sont détectées par introspection.

Revision ID: f1a2b3c4d5e6
Revises: e5f0a1b2c3d4
Create Date: 2026-10-01
"""

from datetime import datetime

import sqlalchemy as sa
from alembic import op

revision = 'f1a2b3c4d5e6'
down_revision = 'e5f0a1b2c3d4'
branch_labels = None
depends_on = None


INDEXES = [
    'CREATE INDEX IF NOT EXISTS ix_campus_is_active ON campus (is_active)',
    'CREATE INDEX IF NOT EXISTS ix_department_campus_id ON department (campus_id)',
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_department_campus_code '
    'ON department (campus_id, code)',
    'CREATE INDEX IF NOT EXISTS ix_folder_campus_id ON folder (campus_id)',
    'CREATE INDEX IF NOT EXISTS ix_user_account_campus_id ON user_account (campus_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_campus_id ON document (campus_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_campus_status_created_at '
    'ON document (campus_id, status, created_at)',
    'CREATE INDEX IF NOT EXISTS ix_setting_key ON setting (key)',
    'CREATE INDEX IF NOT EXISTS ix_setting_campus_id ON setting (campus_id)',
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_setting_global ON setting (key) "
    "WHERE scope = 'global'",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_setting_campus ON setting (key, campus_id) "
    "WHERE scope = 'campus'",
]


def _index_name(statement: str) -> str:
    return statement.split('IF NOT EXISTS ')[1].split(' ON ')[0]


def drop_statements():
    return [f'DROP INDEX IF EXISTS {_index_name(s)}' for s in INDEXES]


def _has_table(inspector, name):
    return inspector.has_table(name)


def _has_column(inspector, table, column):
    return any(col['name'] == column for col in inspector.get_columns(table))


def _create_tables(inspector):
    if not _has_table(inspector, 'institution'):
        op.create_table(
            'institution',
            sa.Column('institution_id', sa.SmallInteger(), primary_key=True),
            sa.Column('name', sa.String(length=200), nullable=False),
            sa.Column('short_name', sa.String(length=50)),
            sa.Column('slogan', sa.String(length=300)),
            sa.Column('address', sa.String(length=500)),
            sa.Column('website', sa.String(length=200)),
            sa.Column('email', sa.String(length=120)),
            sa.Column('phone', sa.String(length=50)),
            sa.Column('logo_url', sa.String(length=500)),
            sa.Column('locale', sa.String(length=10), nullable=False,
                      server_default='fr'),
            sa.Column('timezone', sa.String(length=60), nullable=False,
                      server_default='Africa/Douala'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

    if not _has_table(inspector, 'campus'):
        op.create_table(
            'campus',
            sa.Column('campus_id', sa.Integer(), primary_key=True),
            sa.Column('code', sa.String(length=20), nullable=False),
            sa.Column('name', sa.String(length=150), nullable=False),
            sa.Column('address', sa.String(length=500)),
            sa.Column('city', sa.String(length=120)),
            sa.Column('phone', sa.String(length=50)),
            sa.Column('email', sa.String(length=120)),
            sa.Column('is_active', sa.Boolean(), nullable=False,
                      server_default=sa.true()),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('code', name='uq_campus_code'),
        )

    if not _has_table(inspector, 'setting'):
        op.create_table(
            'setting',
            sa.Column('setting_id', sa.Integer(), primary_key=True),
            sa.Column('key', sa.String(length=120), nullable=False),
            sa.Column('scope', sa.String(length=20), nullable=False,
                      server_default='global'),
            sa.Column('campus_id', sa.Integer(),
                      sa.ForeignKey('campus.campus_id', ondelete='CASCADE')),
            sa.Column('value', sa.JSON(), nullable=False),
            sa.Column('updated_by', sa.Integer(),
                      sa.ForeignKey('user_account.user_id', ondelete='SET NULL')),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.CheckConstraint("scope IN ('global', 'campus')",
                               name='ck_setting_scope'),
        )


def _add_columns(inspector):
    if not _has_column(inspector, 'department', 'campus_id'):
        op.add_column('department', sa.Column('campus_id', sa.Integer(), nullable=True))
    if not _has_column(inspector, 'folder', 'campus_id'):
        op.add_column('folder', sa.Column('campus_id', sa.Integer(), nullable=True))
    if not _has_column(inspector, 'user_account', 'campus_id'):
        op.add_column('user_account', sa.Column('campus_id', sa.Integer(), nullable=True))
    if not _has_column(inspector, 'document', 'campus_id'):
        op.add_column('document', sa.Column('campus_id', sa.Integer(), nullable=True))
    if not _has_column(inspector, 'document', 'retention_expires_at'):
        op.add_column('document', sa.Column('retention_expires_at', sa.DateTime(),
                                            nullable=True))
    if not _has_column(inspector, 'document', 'updated_at'):
        op.add_column('document', sa.Column('updated_at', sa.DateTime(), nullable=True))
    if not _has_column(inspector, 'document', 'deleted_by'):
        op.add_column('document', sa.Column('deleted_by', sa.Integer(), nullable=True))


def _backfill(conn):
    now = datetime.utcnow()
    row = conn.execute(sa.text(
        "SELECT campus_id FROM campus WHERE code = 'PRINCIPAL'"
    )).fetchone()
    if row is None:
        conn.execute(sa.text(
            "INSERT INTO campus (code, name, is_active, created_at, updated_at) "
            "VALUES ('PRINCIPAL', 'Campus principal', TRUE, :now, :now)"
        ), {'now': now})
        row = conn.execute(sa.text(
            "SELECT campus_id FROM campus WHERE code = 'PRINCIPAL'"
        )).fetchone()
    campus_id = row[0]

    conn.execute(sa.text(
        "UPDATE department SET campus_id = :cid WHERE campus_id IS NULL"
    ), {'cid': campus_id})

    conn.execute(sa.text(
        "UPDATE document SET campus_id = ("
        "  SELECT d.campus_id FROM department d "
        "  WHERE d.department_id = document.department_id"
        ") WHERE campus_id IS NULL"
    ))
    conn.execute(sa.text(
        "UPDATE document SET campus_id = :cid WHERE campus_id IS NULL"
    ), {'cid': campus_id})
    conn.execute(sa.text(
        "UPDATE document SET updated_at = created_at WHERE updated_at IS NULL"
    ))
    conn.execute(sa.text(
        "UPDATE user_account SET campus_id = :cid "
        "WHERE campus_id IS NULL AND role_id IN "
        "(SELECT role_id FROM role WHERE name <> 'Admin')"
    ), {'cid': campus_id})


def _enforce_constraints(conn, inspector, dialect):
    if dialect != 'postgresql':
        # SQLite (tests) construit le schéma via create_all().
        return

    conn.execute(sa.text('ALTER TABLE department ALTER COLUMN campus_id SET NOT NULL'))
    conn.execute(sa.text('ALTER TABLE document ALTER COLUMN campus_id SET NOT NULL'))

    dept_fks = {fk['referred_table'] for fk in inspector.get_foreign_keys('department')}
    if 'campus' not in dept_fks:
        op.create_foreign_key('fk_department_campus_id', 'department', 'campus',
                              ['campus_id'], ['campus_id'], ondelete='RESTRICT')

    doc_fks = inspector.get_foreign_keys('document')
    doc_targets = {fk['referred_table'] for fk in doc_fks}
    if 'campus' not in doc_targets:
        op.create_foreign_key('fk_document_campus_id', 'document', 'campus',
                              ['campus_id'], ['campus_id'], ondelete='RESTRICT')
    if 'user_account' not in doc_targets:
        op.create_foreign_key('fk_document_deleted_by', 'document', 'user_account',
                              ['deleted_by'], ['user_id'], ondelete='SET NULL')

    for constraint in inspector.get_unique_constraints('department'):
        if constraint.get('column_names') == ['code']:
            op.drop_constraint(constraint['name'], 'department', type_='unique')


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    dialect = conn.dialect.name

    _create_tables(inspector)
    inspector = sa.inspect(conn)
    _add_columns(inspector)
    _backfill(conn)
    inspector = sa.inspect(conn)
    _enforce_constraints(conn, inspector, dialect)

    for statement in INDEXES:
        op.execute(sa.text(statement))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    dialect = conn.dialect.name

    for statement in drop_statements():
        op.execute(sa.text(statement))

    if dialect == 'postgresql':
        dept_fks = {fk['name'] for fk in inspector.get_foreign_keys('department')}
        if 'fk_department_campus_id' in dept_fks:
            op.drop_constraint('fk_department_campus_id', 'department', type_='foreignkey')
        doc_fks = {fk['name'] for fk in inspector.get_foreign_keys('document')}
        if 'fk_document_campus_id' in doc_fks:
            op.drop_constraint('fk_document_campus_id', 'document', type_='foreignkey')
        if 'fk_document_deleted_by' in doc_fks:
            op.drop_constraint('fk_document_deleted_by', 'document', type_='foreignkey')

    for table, column in (
        ('document', 'deleted_by'),
        ('document', 'updated_at'),
        ('document', 'retention_expires_at'),
        ('document', 'campus_id'),
        ('user_account', 'campus_id'),
        ('folder', 'campus_id'),
        ('department', 'campus_id'),
    ):
        if dialect == 'postgresql' and _has_column(inspector, table, column):
            op.drop_column(table, column)

    if _has_table(inspector, 'setting'):
        op.drop_table('setting')
    if _has_table(inspector, 'campus'):
        op.drop_table('campus')
    if _has_table(inspector, 'institution'):
        op.drop_table('institution')
