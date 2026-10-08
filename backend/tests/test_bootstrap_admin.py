"""
Bootstrap sécurisé du super admin (12-factor) + données de démonstration.

Complète test_seeds.py (P0.6) : identifiants via variables d'environnement
ADMIN_*, garde production, idempotence du bootstrap et jeu de démo.
"""

import datetime as dt
import io

import pytest

from extensions import db

from app import demo_data, seeds
from app.models.campus import Campus
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.role import Role
from app.models.user import UserAccount
from app.storage import get_storage


@pytest.fixture
def clean_env(monkeypatch):
    """Environnement ADMIN_* vidé (repli de développement garanti)."""
    for key in seeds._ADMIN_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv('FLASK_ENV', 'testing')
    return monkeypatch


# ---------------------------------------------------------------------------
# Bootstrap par variables d'environnement
# ---------------------------------------------------------------------------


def test_admin_bootstrap_config_env_gagne(monkeypatch, clean_env):
    monkeypatch.setenv('ADMIN_USERNAME', 'root')
    monkeypatch.setenv('ADMIN_PASSWORD', 'MotDePasse@42')

    cfg = seeds.admin_bootstrap_config()

    assert cfg['username'] == 'root'
    assert cfg['password'] == 'MotDePasse@42'
    assert cfg['email'] == 'admin@uniarchive.edu'  # repli pour les autres clés


def test_admin_bootstrap_config_repli_dev(clean_env):
    cfg = seeds.admin_bootstrap_config()

    assert cfg['username'] == 'admin'
    assert cfg['password'] == 'Admin@2024'


def test_seed_admin_utilise_les_variables_env(app, clean_env, monkeypatch):
    # La fixture autouse `fresh_data` a déjà créé « admin » avec le repli dev :
    # on choisit un username qui n'existe pas encore.
    monkeypatch.setenv('ADMIN_USERNAME', 'suproot')
    monkeypatch.setenv('ADMIN_PASSWORD', 'MotDePasse@42')
    monkeypatch.setenv('ADMIN_EMAIL', 'root@etu.univ-douala.com')
    monkeypatch.setenv('ADMIN_MATRICULE', 'ROOT001')  # ADMIN001 est déjà pris par la fixture

    runner = app.test_cli_runner()
    res = runner.invoke(args=['seed', 'admin'])

    assert res.exit_code == 0, res.output
    admin = UserAccount.query.filter_by(username='suproot').first()
    assert admin is not None
    assert admin.email == 'root@etu.univ-douala.com'
    assert admin.check_password('MotDePasse@42')
    assert admin.role.name == 'Admin'
    # L'admin repli de la fixture reste intact.
    assert UserAccount.query.filter_by(username='admin').first() is not None


def test_seed_admin_rejette_mot_de_passe_faible(app, clean_env, monkeypatch):
    # Username inexistant : la validation doit bien s'exécuter (sinon le seed
    # sortirait par « déjà en place »).
    monkeypatch.setenv('ADMIN_USERNAME', 'newadmin')
    monkeypatch.setenv('ADMIN_EMAIL', 'newadmin@etu.univ-douala.com')
    monkeypatch.setenv('ADMIN_MATRICULE', 'ROOT001')
    monkeypatch.setenv('ADMIN_PASSWORD', 'faible')  # pas de majuscule ni chiffre

    runner = app.test_cli_runner()
    res = runner.invoke(args=['seed', 'admin'])

    assert res.exit_code != 0
    assert isinstance(res.exception, ValueError)
    assert UserAccount.query.filter_by(username='newadmin').first() is None


def test_seed_admin_est_idempotent(app, clean_env):
    # « admin » existe déjà (fixture fresh_data) → 0 créé, aucun doublon.
    runner = app.test_cli_runner()
    res = runner.invoke(args=['seed', 'admin'])

    assert res.exit_code == 0, res.output
    assert 'déjà en place' in res.output
    assert UserAccount.query.filter_by(username='admin').count() == 1


# ---------------------------------------------------------------------------
# Garde production : pas de mot de passe par défaut
# ---------------------------------------------------------------------------


def test_seed_admin_refuse_repli_en_production(app, clean_env, monkeypatch):
    monkeypatch.setenv('FLASK_ENV', 'production')
    monkeypatch.setenv('ADMIN_USERNAME', 'newadmin')  # compte absent de la base

    with app.app_context():
        with pytest.raises(RuntimeError, match='ADMIN_PASSWORD'):
            seeds.seed_admin()


def test_seed_admin_passe_en_production_avec_env(app, clean_env, monkeypatch):
    monkeypatch.setenv('FLASK_ENV', 'production')
    monkeypatch.setenv('ADMIN_USERNAME', 'newadmin')
    monkeypatch.setenv('ADMIN_PASSWORD', 'MotDePasse@42')
    monkeypatch.setenv('ADMIN_EMAIL', 'newadmin@etu.univ-douala.com')  # email UNIQUE
    monkeypatch.setenv('ADMIN_MATRICULE', 'ROOT001')

    with app.app_context():
        assert seeds.seed_admin() == 1

    admin = UserAccount.query.filter_by(username='newadmin').first()
    assert admin is not None and admin.check_password('MotDePasse@42')


# ---------------------------------------------------------------------------
# Jeu de données de démonstration
# ---------------------------------------------------------------------------


@pytest.fixture
def seeded_base(app):
    """Base de base (rôles, campus, départements…) + admin."""
    runner = app.test_cli_runner()
    res = runner.invoke(args=['seed', 'all'])
    assert res.exit_code == 0, res.output
    return app


def test_demo_data_document_complet(seeded_base):
    with seeded_base.app_context():
        created = demo_data.seed_demo_content()

        assert created['tags'] == 4
        assert created['documents'] == len(demo_data.DEMO_DOCUMENTS)

        doc = Document.query.filter_by(
            title="Thèse — Fouille de données appliquée à la santé").one()
        assert doc.campus.code == 'PRINCIPAL'
        assert doc.doc_type.name == 'Thèse'
        assert doc.department.code == 'INFO'
        assert {t.name for t in doc.tags} == {'Recherche'}
        assert doc.status == 'active'
        assert doc.retention_period == 3650
        assert doc.retention_expires_at > dt.datetime.utcnow()

        version = doc.versions.first()
        assert version.version_number == 1
        assert version.mime_type == 'application/pdf'
        assert version.uploaded_by is not None

        storage = get_storage()
        assert storage.exists(version.storage_url)
        assert storage.open(version.storage_url).read(5) == b'%PDF-'
        assert doc.size_bytes == len(storage.open(version.storage_url).read())


def test_demo_data_est_idempotent(seeded_base):
    with seeded_base.app_context():
        first = demo_data.seed_demo_content()
        second = demo_data.seed_demo_content()

        # Idempotent : rien n'est recréé au second passage.
        assert first['documents'] == len(demo_data.DEMO_DOCUMENTS)
        assert second['documents'] == 0
        assert Document.query.count() == len(demo_data.DEMO_DOCUMENTS)
        # Chaque document garde exactement une version et son fichier.
        for doc in Document.query.all():
            assert doc.versions.count() == 1
            assert get_storage().exists(doc.versions.first().storage_url)


def test_cli_demo_data_refuse_en_production(seeded_base, monkeypatch):
    monkeypatch.setenv('FLASK_ENV', 'production')
    runner = seeded_base.test_cli_runner()

    res = runner.invoke(args=['seed', 'demo-data'])

    assert res.exit_code != 0
    assert 'production' in res.output
    assert Document.query.count() == 0


def test_cli_demo_data_force_passe_en_production(seeded_base, monkeypatch):
    monkeypatch.setenv('FLASK_ENV', 'production')
    runner = seeded_base.test_cli_runner()

    res = runner.invoke(args=['seed', 'demo-data', '--force'])

    assert res.exit_code == 0, res.output
    assert Document.query.count() == len(demo_data.DEMO_DOCUMENTS)


def test_demo_data_sans_seeds_de_base_leve_app_context(app):
    # La fixture fresh_data a seedé la base : on retire une référence
    # indispensable (types de documents) pour vérifier l'échec rapide.
    from app.models.doc_type import DocType

    db.session.query(DocType).delete()
    with pytest.raises(demo_data.DemoDataError):
        demo_data.seed_demo_content()


def test_cli_demo_data(seeded_base):
    runner = seeded_base.test_cli_runner()
    res = runner.invoke(args=['seed', 'demo-data'])

    assert res.exit_code == 0, res.output
    assert 'documents de démo' in res.output
    assert Document.query.count() == len(demo_data.DEMO_DOCUMENTS)


def test_pdf_genere_est_valide():
    pdf = demo_data._minimal_pdf("Ligne une\nLigne (deux) \\ trois")
    assert pdf.startswith(b'%PDF-1.4')
    assert pdf.rstrip().endswith(b'%%EOF')
    # Contenu texte échappé, une occurrence par ligne
    assert b'Ligne une' in pdf
    assert b'Ligne \\(deux\\) \\\\ trois' in pdf
