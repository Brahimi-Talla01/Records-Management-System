"""
Commandes de seed (plan07 — P0.6) : création sur base vide + idempotence.
"""

from app.models.department import Department
from app.models.doc_type import DocType
from app.models.folder import Folder
from app.models.role import Role
from app.models.user import UserAccount


def test_commandes_seed_inscrites(app):
    runner = app.test_cli_runner()
    res = runner.invoke(args=['seed', '--help'])

    assert res.exit_code == 0, res.output
    for target in ('roles', 'folders', 'doctypes', 'departments',
                   'admin', 'demo', 'all'):
        assert target in res.output


def test_seed_all_sur_base_vide(app):
    runner = app.test_cli_runner()
    with app.app_context():
        from extensions import db
        db.drop_all()

    res = runner.invoke(args=['seed', 'all'])

    assert res.exit_code == 0, res.output
    assert 'Seed terminé' in res.output
    with app.app_context():
        assert Role.query.count() == 4
        assert DocType.query.count() == 6
        assert Folder.query.count() == 4
        assert Department.query.count() == 4
        assert UserAccount.query.count() == 4

        admin = UserAccount.query.filter_by(username='admin').first()
        assert admin is not None
        assert admin.check_password('Admin@2024')
        assert admin.role.name == 'Admin'
        assert admin.department.code == 'ADMIN'


def test_seed_all_est_idempotent(app):
    runner = app.test_cli_runner()
    first = runner.invoke(args=['seed', 'all'])
    second = runner.invoke(args=['seed', 'all'])

    assert first.exit_code == 0 and second.exit_code == 0
    assert 'déjà en place' in second.output
    with app.app_context():
        assert UserAccount.query.count() == 4  # pas de doublon


def test_cible_unique_seule(app):
    runner = app.test_cli_runner()

    res = runner.invoke(args=['seed', 'roles'])

    assert res.exit_code == 0, res.output
    assert 'rôles' in res.output


def test_seed_admin_identifiants_personnalisés(app):
    runner = app.test_cli_runner()
    with app.app_context():
        from extensions import db
        db.drop_all()

    res = runner.invoke(args=[
        'seed', 'admin', '--username', 'root', '--password', 'Root@2026',
    ])

    assert res.exit_code == 0, res.output
    with app.app_context():
        root = UserAccount.query.filter_by(username='root').first()
        assert root is not None
        assert root.check_password('Root@2026')
        # Les dépendances (rôles/départements) ont été créées automatiquement
        assert Role.query.count() == 4
