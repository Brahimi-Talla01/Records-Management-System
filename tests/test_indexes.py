"""
Index de base de données (plan 07 — P0.9).

Deux sources doivent rester alignées :

* les **modèles** (`index=True` / `db.Index`) → `create_all()` des bases fraîches ;
* la **migration** `e5f0a1b2c3d4` → bases préexistantes stampées sur la
  baseline `23042faea7a9` par l'entrypoint.

Le moindre écart (un index ajouté au modèle sans migration, ou l'inverse) fait
échouer `test_migration_et_modeles_sont_alignes`.
"""

import importlib.util
import pathlib

from sqlalchemy import text

from extensions import db

MIGRATIONS_DIR = (pathlib.Path(__file__).resolve().parent.parent
                  / 'migrations' / 'versions')
REVISION = 'e5f0a1b2c3d4'
BASELINE = '23042faea7a9'

# Contrat des index attendus (24).
EXPECTED = {
    # document : filtres (FK, statut, confidentialité) + tri
    'ix_document_department_id',
    'ix_document_doc_type_id',
    'ix_document_folder_id',
    'ix_document_created_at',
    'ix_document_confidentiality_level',
    'ix_document_status_created_at',
    'ix_document_tag_tag_id',
    'ix_document_version_document_id',
    'ix_document_version_uploaded_by',
    # dossiers : arborescence
    'ix_folder_parent_folder_id',
    # utilisateurs : listes filtrées par rôle / département / actif
    'ix_user_account_role_id',
    'ix_user_account_department_id',
    'ix_user_account_is_active',
    # journal d'audit : liste + compteur de tentatives échouées
    'ix_audit_log_action',
    'ix_audit_log_created_at',
    'ix_audit_log_user_id',
    'ix_audit_log_document_id',
    'ix_audit_log_action_user_id_created_at',
    # jetons / historique / notifications
    'ix_two_factor_code_user_id',
    'ix_password_reset_token_user_id',
    'ix_search_history_user_id',
    'ix_search_history_searched_at',
    'ix_notification_user_id',
    'ix_security_alert_user_id',
}


def load_migration():
    """Importe la migration depuis son fichier (hors paquet `app`)."""
    path = MIGRATIONS_DIR / f'{REVISION}_add_indexes_p0.py'
    spec = importlib.util.spec_from_file_location('add_indexes_p0', path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Migration illisible : {path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def model_index_names():
    names = set()
    for table in db.metadata.sorted_tables:
        for index in table.indexes:
            if index.name:
                names.add(index.name)
    return names


def ddl_index_names(statements):
    """`'CREATE INDEX IF NOT EXISTS ix_x ON t (…)'` → `'ix_x'`."""
    return {s.split('IF NOT EXISTS ')[1].split(' ON ')[0] for s in statements}


# ---------------------------------------------------------------------------
# Contrat
# ---------------------------------------------------------------------------


def test_les_modeles_declarent_exactement_les_index_attendus():
    assert model_index_names() == EXPECTED


def test_migration_et_modeles_sont_alignes():
    """Tout index du modèle existe en migration, et réciproquement."""
    migration = load_migration()

    assert ddl_index_names(migration.INDEXES) == model_index_names()
    assert len(migration.INDEXES) == len(model_index_names())  # pas de doublon


def test_migration_repose_sur_la_baseline_immuable():
    migration = load_migration()

    assert migration.revision == REVISION
    assert migration.down_revision == BASELINE
    assert list(MIGRATIONS_DIR.glob(f'{BASELINE}*.py')), "migration initiale absente"
    # Le maillon intermédiaire ne doit pas être perdu
    assert migration.down_revision == '23042faea7a9'


# ---------------------------------------------------------------------------
# Sémantique des index chauds
# ---------------------------------------------------------------------------


def test_index_couvre_le_compteur_de_tentatives_echouees():
    """
    `_check_multiple_failed_attempts` filtre
    `action = … AND user_id = … AND created_at >= …` : cet index lui évite une
    séquentielle sur le journal à chaque échec de connexion.
    """
    migration = load_migration()
    stmt = next(s for s in migration.INDEXES
                if s.startswith('CREATE INDEX IF NOT EXISTS '
                                'ix_audit_log_action_user_id_created_at'))

    assert 'ON audit_log (action, user_id, created_at)' in stmt


def test_index_couvre_les_listes_de_documents():
    """`WHERE status = … ORDER BY created_at DESC` → index composite."""
    migration = load_migration()
    stmt = next(s for s in migration.INDEXES
                if s.startswith('CREATE INDEX IF NOT EXISTS '
                                'ix_document_status_created_at'))

    assert 'ON document (status, created_at)' in stmt


# ---------------------------------------------------------------------------
# Exécution réelle
# ---------------------------------------------------------------------------


def test_sql_des_index_s_execute_et_est_idempotent():
    """Le DDL tourne sur SQLite (tests) et Postgres (prod), deux fois de suite."""
    migration = load_migration()

    for statement in migration.INDEXES:
        db.session.execute(text(statement))
        db.session.execute(text(statement))  # IF NOT EXISTS : pas d'erreur
    db.session.commit()

    created = {row[0] for row in db.session.execute(text(
        "SELECT name FROM sqlite_master WHERE type = 'index' "
        "AND name LIKE 'ix_%'")).fetchall()}

    assert EXPECTED <= created


def test_downgrade_retire_les_index():
    """`downgrade()` : les requêtes DROP doivent être syntaxiquement valides."""
    migration = load_migration()

    drops = migration.drop_statements()
    assert len(drops) == len(migration.INDEXES)
    assert all(s.startswith('DROP INDEX IF EXISTS ') and ' ON ' not in s
               for s in drops), "le DROP doit être `DROP INDEX IF EXISTS <nom>`"

    for statement in drops:
        db.session.execute(text(statement))
    db.session.commit()

    remaining = {row[0] for row in db.session.execute(text(
        "SELECT name FROM sqlite_master WHERE type = 'index' "
        "AND name LIKE 'ix_%'")).fetchall()}

    assert remaining & EXPECTED == set()
