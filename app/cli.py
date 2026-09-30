"""
Commandes Flask de l'application (plan07 — P0.6).

`flask seed ...` exécute les seeds idempotents de `app/seeds.py`.
Le groupe est enregistré dans `create_app()` : `flask --app wsgi seed all`.
"""

import click
from flask.cli import with_appcontext

from app import seeds


def _report(target, created):
    if created:
        click.echo(f"  ✓ {target} : {created} ligne(s) créée(s)")
    else:
        click.echo(f"  - {target} : déjà en place")


@click.group('seed')
@with_appcontext
def seed_group():
    """Seeds idempotents (chaque cible ne crée que ce qui manque)."""
    from sqlalchemy import inspect

    from extensions import db

    # Démarrage sur base vide : le schéma est créé ici (create_all idempotent).
    # Le schéma migré (colonnes/index existants) reste du ressort d'Alembic.
    if not inspect(db.engine).has_table('role'):
        click.echo("  (tables absentes → create_all)")
        db.create_all()


@seed_group.command('roles')
@with_appcontext
def seed_roles_cmd():
    """Rôles standards (Admin, Prof, Etudiant, Secretaire)."""
    _report('rôles', seeds.seed_roles())


@seed_group.command('folders')
@with_appcontext
def seed_folders_cmd():
    """Dossiers racine de l'arborescence documentaire."""
    _report('dossiers', seeds.seed_folders())


@seed_group.command('doctypes')
@with_appcontext
def seed_doctypes_cmd():
    """Types de documents et leur rétention par défaut."""
    _report('types de documents', seeds.seed_doctypes())


@seed_group.command('departments')
@with_appcontext
def seed_departments_cmd():
    """Départements (crée les dossiers manquants au passage)."""
    _report('départements', seeds.seed_departments())


@seed_group.command('admin')
@click.option('--username', default=None, help="Nom d'utilisateur du compte admin.")
@click.option('--password', default=None, help="Mot de passe initial (défaut : Admin@2024).")
@with_appcontext
def seed_admin_cmd(username, password):
    """Compte administrateur initial."""
    _report('compte admin', seeds.seed_admin(
        username=username or seeds.DEFAULT_ADMIN['username'],
        password=password or seeds.DEFAULT_ADMIN['password'],
    ))


@seed_group.command('demo')
@with_appcontext
def seed_demo_cmd():
    """Comptes de démonstration (Prof / Secretaire / Etudiant)."""
    _report('comptes démo', seeds.seed_demo())


@seed_group.command('all')
@click.option('--username', default=None, help="Nom d'utilisateur du compte admin.")
@click.option('--password', default=None, help="Mot de passe initial de l'admin.")
@with_appcontext
def seed_all_cmd(username, password):
    """Toutes les cibles, dans l'ordre de dépendance."""
    click.echo("Seed complet…")
    results = seeds.seed_all(username=username, password=password)
    labels = {
        'roles': 'rôles',
        'folders': 'dossiers',
        'doctypes': 'types de documents',
        'departments': 'départements',
        'admin': 'compte admin',
        'demo': 'comptes démo',
    }
    for key, count in results.items():
        _report(labels.get(key, key), count)
    click.echo("✓ Seed terminé")


def register_commands(application):
    """Attache les commandes CLI à l'application (appelé par create_app)."""
    application.cli.add_command(seed_group)
