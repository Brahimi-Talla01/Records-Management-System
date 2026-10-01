"""
Index de base de données (plan 07 — P0.9, P1 puis P4).

Deux sources doivent rester alignées :

* les **modèles** (`index=True` / `db.Index`) → `create_all()` des bases fraîches ;
* les **migrations** (`e5f0a1b2c3d4`, `f1a2b3c4d5e6` puis `b4c5d6e7f8a9`) → bases
  préexistantes stampées sur la baseline `23042faea7a9` par l'entrypoint.

Le moindre écart (un index ajouté au modèle sans migration, ou l'inverse) fait
échouer `test_migration_et_modeles_sont_alignes`.

Les index PostgreSQL purs (GIN tsvector / pg_trgm, P4) ne sont PAS dans ce
contrat : ils sont créés par la migration, uniquement sur PostgreSQL.
"""

import importlib.util
import pathlib

from sqlalchemy import text

from extensions import db

MIGRATIONS_DIR = (pathlib.Path(__file__).resolve().parent.parent
                  / 'migrations' / 'versions')
REVISION_P0 = 'e5f0a1b2c3d4'
REVISION_P1 = 'f1a2b3c4d5e6'
REVISION_P4 = 'b4c5d6e7f8a9'
BASELINE = '23042faea7a9'

# Contrat des index attendus — P0 (24).
EXPECTED_P0 = {
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

# Contrat des index ajoutés en P1 (multi-campus + réglages).
EXPECTED_P1 = {
    'ix_campus_is_active',
    'ix_department_campus_id',
    'uq_department_campus_code',
    'ix_folder_campus_id',
    'ix_user_account_campus_id',
    'ix_document_campus_id',
    'ix_document_campus_status_created_at',
    'ix_setting_key',
    'ix_setting_campus_id',
    'uq_setting_global',
    'uq_setting_campus',
}

# Contrat des index ajoutés en P4 (recherche, dashboard, notifications).
EXPECTED_P4 = {
    'ix_notification_user_is_read_created_at',
    'ix_search_history_user_searched_at',
}

EXPECTED = EXPECTED_P0 | EXPECTED_P1 | EXPECTED_P4


def load_migration(revision, filename):
    """Importe une migration depuis son fichier (hors paquet `app`)."""
    path = MIGRATIONS_DIR / f'{revision}_{filename}.py'
    spec = importlib.util.spec_from_file_location(revision, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Migration illisible : {path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_p0():
    return load_migration(REVISION_P0, 'add_indexes_p0')


def load_p1():
    return load_migration(REVISION_P1, 'campus_institution_setting')


def load_p4():
    return load_migration(REVISION_P4, 'search_dashboard_notifications')


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


# --------------------------------------------------------------------------- #
# Contrat
# --------------------------------------------------------------------------- #

def test_les_modeles_declarent_exactement_les_index_attendus():
    assert model_index_names() == EXPECTED


def test_migration_et_modeles_sont_alignes():
    """Tout index du modèle existe en migration, et réciproquement."""
    p0, p1, p4 = load_p0(), load_p1(), load_p4()

    migration_names = (ddl_index_names(p0.INDEXES)
                       | ddl_index_names(p1.INDEXES)
                       | ddl_index_names(p4.INDEXES))
    assert migration_names == model_index_names()
    assert (len(p0.INDEXES) + len(p1.INDEXES) + len(p4.INDEXES)
            == len(model_index_names()))  # pas de doublon


def test_migrations_reposent_sur_la_baseline_immuable():
    p0, p1, p4 = load_p0(), load_p1(), load_p4()

    assert p0.revision == REVISION_P0
    assert p0.down_revision == BASELINE
    assert p1.revision == REVISION_P1
    assert p1.down_revision == REVISION_P0
    assert p4.revision == REVISION_P4
    assert p4.down_revision == REVISION_P1


# --------------------------------------------------------------------------- #
# Sémantique des index chauds
# --------------------------------------------------------------------------- #

def test_index_couvre_le_compteur_de_tentatives_echouees():
    p0 = load_p0()
    stmt = next(s for s in p0.INDEXES
                if s.startswith('CREATE INDEX IF NOT EXISTS '
                                'ix_audit_log_action_user_id_created_at'))

    assert 'ON audit_log (action, user_id, created_at)' in stmt


def test_index_couvre_les_listes_de_documents():
    """`WHERE status = … ORDER BY created_at DESC` → index composite."""
    p0 = load_p0()
    stmt = next(s for s in p0.INDEXES
                if s.startswith('CREATE INDEX IF NOT EXISTS '
                                'ix_document_status_created_at'))

    assert 'ON document (status, created_at)' in stmt


def test_index_p1_filtre_par_campus_et_par_age():
    p1 = load_p1()
    names = ddl_index_names(p1.INDEXES)

    assert 'ix_document_campus_status_created_at' in names
    assert 'uq_department_campus_code' in names
    assert 'uq_setting_global' in names


def test_index_p4_couvre_le_badge_et_l_historique():
    p4 = load_p4()
    names = ddl_index_names(p4.INDEXES)

    assert 'ix_notification_user_is_read_created_at' in names
    assert 'ix_search_history_user_searched_at' in names


def test_index_p4_fulltext_reserves_a_postgresql():
    """GIN tsvector / pg_trgm : DDL séparé, jamais exécuté sur SQLite."""
    p4 = load_p4()

    assert any('USING GIN (search_vector)' in s for s in p4.PG_DDL)
    assert any('gin_trgm_ops' in s for s in p4.PG_DDL)
    assert any('CREATE TRIGGER trg_document_search_vector' in s
               for s in p4.PG_DDL)
    assert p4.drop_statements() == [
        'DROP INDEX IF EXISTS ix_notification_user_is_read_created_at',
        'DROP INDEX IF EXISTS ix_search_history_user_searched_at',
    ]
    for statement in p4.PG_DDL + p4.PG_DOWNGRADE:
        assert 'notification (' not in statement
        assert 'search_history (' not in statement


# --------------------------------------------------------------------------- #
# Exécution réelle
# --------------------------------------------------------------------------- #

def existing_ix_indexes():
    """Index `ix_*` réellement présents — requête adaptée au dialecte."""
    if db.engine.dialect.name == 'postgresql':
        rows = db.session.execute(text(
            "SELECT indexname FROM pg_indexes "
            "WHERE schemaname = current_schema() AND indexname LIKE 'ix_%'"
        )).fetchall()
    else:
        rows = db.session.execute(text(
            "SELECT name FROM sqlite_master WHERE type = 'index' "
            "AND name LIKE 'ix_%'")).fetchall()
    return {row[0] for row in rows}


def test_sql_des_index_s_execute_et_est_idempotent():
    """Le DDL tourne sur SQLite (tests) et Postgres (prod), deux fois de suite."""
    statements = (load_p0().INDEXES + load_p1().INDEXES
                  + load_p4().INDEXES)

    for statement in statements:
        db.session.execute(text(statement))
        db.session.execute(text(statement))  # IF NOT EXISTS : pas d'erreur
    db.session.commit()

    assert ({i for i in EXPECTED if i.startswith('ix_')}
            <= existing_ix_indexes())


def test_downgrade_retire_les_index():
    """`downgrade()` : les requêtes DROP doivent être syntaxiquement valides."""
    drops = (load_p0().drop_statements() + load_p1().drop_statements()
             + load_p4().drop_statements())
    statements = (load_p0().INDEXES + load_p1().INDEXES
                  + load_p4().INDEXES)
    assert len(drops) == len(statements)
    assert all(s.startswith('DROP INDEX IF EXISTS ') and ' ON ' not in s
               for s in drops), "le DROP doit être `DROP INDEX IF EXISTS <nom>`"

    for statement in drops:
        db.session.execute(text(statement))
    db.session.commit()

    assert existing_ix_indexes() & EXPECTED_P0 == set()
