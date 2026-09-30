"""Index répartis sur les colonnes filtrées et triées (P0.9 du plan 07).

Aucun index n'existait en dehors des contraintes UNIQUE : chaque liste
(`document`, `audit_log`, `user_account`) tombait sur une séquentielle.

Toutes les instructions sont idempotentes (`IF NOT EXISTS`) :

* base fraîche : `create_all()` les crée déjà depuis les modèles, la migration
  les confirme sans erreur ;
* base préexistante : la migration les ajoute (l'entrypoint stamp la révision
  de baseline `23042faea7a9` si la table `alembic_version` est absente).

Révision générée depuis `db.metadata` : `tests/test_indexes.py` verrouille
l'alignement modèles <-> migration.

Revision ID: e5f0a1b2c3d4
Revises: 23042faea7a9
Create Date: 2026-09-30
"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e5f0a1b2c3d4'
down_revision = '23042faea7a9'
branch_labels = None
depends_on = None


INDEXES = [
    'CREATE INDEX IF NOT EXISTS ix_folder_parent_folder_id ON folder (parent_folder_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_confidentiality_level ON document (confidentiality_level)',
    'CREATE INDEX IF NOT EXISTS ix_document_created_at ON document (created_at)',
    'CREATE INDEX IF NOT EXISTS ix_document_department_id ON document (department_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_doc_type_id ON document (doc_type_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_folder_id ON document (folder_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_status_created_at ON document (status, created_at)',
    'CREATE INDEX IF NOT EXISTS ix_user_account_department_id ON user_account (department_id)',
    'CREATE INDEX IF NOT EXISTS ix_user_account_is_active ON user_account (is_active)',
    'CREATE INDEX IF NOT EXISTS ix_user_account_role_id ON user_account (role_id)',
    'CREATE INDEX IF NOT EXISTS ix_audit_log_action ON audit_log (action)',
    'CREATE INDEX IF NOT EXISTS ix_audit_log_action_user_id_created_at ON audit_log (action, user_id, created_at)',
    'CREATE INDEX IF NOT EXISTS ix_audit_log_created_at ON audit_log (created_at)',
    'CREATE INDEX IF NOT EXISTS ix_audit_log_document_id ON audit_log (document_id)',
    'CREATE INDEX IF NOT EXISTS ix_audit_log_user_id ON audit_log (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_tag_tag_id ON document_tag (tag_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_version_document_id ON document_version (document_id)',
    'CREATE INDEX IF NOT EXISTS ix_document_version_uploaded_by ON document_version (uploaded_by)',
    'CREATE INDEX IF NOT EXISTS ix_notification_user_id ON notification (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_password_reset_token_user_id ON password_reset_token (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_search_history_searched_at ON search_history (searched_at)',
    'CREATE INDEX IF NOT EXISTS ix_search_history_user_id ON search_history (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_security_alert_user_id ON security_alert (user_id)',
    'CREATE INDEX IF NOT EXISTS ix_two_factor_code_user_id ON two_factor_code (user_id)',
]


def index_name(statement):
    """`'CREATE INDEX IF NOT EXISTS ix_x ON t (…)'` → `'ix_x'`."""
    return statement.split('IF NOT EXISTS ')[1].split(' ON ')[0]


def drop_statements():
    """Requêtes de retour (exposées telles quelles : `tests/test_indexes.py`
    les exécute, `op` n'existant que dans un contexte Alembic)."""
    return [f'DROP INDEX IF EXISTS {index_name(s)}' for s in INDEXES]


def upgrade():
    """Ajoute les index manquants (inoffensif s'ils existent déjà)."""
    for statement in INDEXES:
        op.execute(sa.text(statement))


def downgrade():
    """Retire les index ajoutés (les contraintes UNIQUE restent en place)."""
    for statement in drop_statements():
        op.execute(sa.text(statement))
