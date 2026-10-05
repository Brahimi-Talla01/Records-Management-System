"""
Commandes Flask de l'application (plan07 — P0.6).

`flask seed ...` exécute les seeds idempotents de `app/seeds.py`.
Le groupe est enregistré dans `create_app()` : `flask --app wsgi seed all`.
"""

import os

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


@seed_group.command('institution')
@with_appcontext
def seed_institution_cmd():
    """Profil de l'établissement (ligne unique)."""
    _report('institution', seeds.seed_institution())


@seed_group.command('campuses')
@with_appcontext
def seed_campuses_cmd():
    """Campus principal initial."""
    _report('campus', seeds.seed_campuses())


@seed_group.command('settings')
@with_appcontext
def seed_settings_cmd():
    """Réglages globaux d'usine (registre typé)."""
    _report('réglages', seeds.seed_settings())


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
@click.option('--username', default=None, help="Nom d'utilisateur (défaut : ADMIN_USERNAME ou 'admin').")
@click.option('--password', default=None,
              help='Mot de passe initial (défaut : ADMIN_PASSWORD ; refusé en production si absent).')
@with_appcontext
def seed_admin_cmd(username, password):
    """Compte super admin de bootstrap (identifiants via ADMIN_*)."""
    _report('compte admin', seeds.seed_admin(username=username, password=password))


@seed_group.command('demo')
@with_appcontext
def seed_demo_cmd():
    """Comptes de démonstration (Prof / Secretaire / Etudiant)."""
    _report('comptes démo', seeds.seed_demo())


@seed_group.command('demo-data')
@click.option('--force', is_flag=True,
              help="Autorise l'exécution même en FLASK_ENV=production.")
@with_appcontext
def seed_demo_data_cmd(force):
    """Jeu de démonstration : documents PDF réels + étiquettes."""
    from app import demo_data

    if os.environ.get('FLASK_ENV', '').lower() == 'production' and not force:
        raise click.UsageError(
            "Jeu de démonstration refusé en FLASK_ENV=production "
            "(contourner explicitement avec --force).")
    try:
        results = demo_data.seed_demo_content()
    except demo_data.DemoDataError as exc:
        raise click.UsageError(str(exc))
    _report('étiquettes de démo', results['tags'])
    _report('documents de démo', results['documents'])


@seed_group.command('all')
@click.option('--username', default=None, help="Nom d'utilisateur du compte admin (défaut : ADMIN_USERNAME).")
@click.option('--password', default=None, help="Mot de passe initial de l'admin (défaut : ADMIN_PASSWORD).")
@with_appcontext
def seed_all_cmd(username, password):
    """Toutes les cibles, dans l'ordre de dépendance."""
    click.echo("Seed complet…")
    results = seeds.seed_all(username=username, password=password)
    labels = {
        'institution': 'institution',
        'campuses': 'campus',
        'settings': 'réglages',
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


@click.group('retention')
@with_appcontext
def retention_group():
    """Cycle de vie des documents en fin de conservation (plan 07 — P5)."""


@retention_group.command('run')
@click.option('--dry-run', is_flag=True,
              help='Simule sans écrire (hors rapport).')
@click.option('--campus-id', default=None, type=int,
              help='Limiter le traitement à un campus (défaut : tous).')
@with_appcontext
def retention_run_cmd(dry_run, campus_id):
    """Préavis, archivage et purge selon les réglages `archives.retention_*`."""
    from app.services.retention_service import RetentionService

    report = RetentionService.run(dry_run=dry_run, campus_id=campus_id)
    mode = 'SIMULATION' if report.dry_run else 'exécution'
    click.echo(f"Rétention ({mode}) — préavis : {report.warnings_sent}, "
               f"archivés : {report.archived}, purgés : {report.purged}")
    if report.details:
        click.echo(f"  détails : {report.details}")


@retention_group.command('status')
@with_appcontext
def retention_status_cmd():
    """Compteurs de rétention et dernier rapport (aucun effet de bord)."""
    import json

    from app.services.retention_service import RetentionService

    click.echo(json.dumps(RetentionService.status(), indent=2,
                          ensure_ascii=False, default=str))


@click.group('perf')
@with_appcontext
def perf_group():
    """Performance (§7.5.4 — P6) : plan d'exécution des requêtes lourdes."""


@perf_group.command('explain')
@click.option('--json', 'as_json', is_flag=True,
              help='Sortie JSON (diffable ou lisible par la CI).')
@with_appcontext
def perf_explain_cmd(as_json):
    """EXPLAIN ANALYZE (PostgreSQL) / EXPLAIN QUERY PLAN (SQLite), 10 requêtes."""
    import json as json_lib

    from app.services.perf_service import explain

    report = explain()
    if as_json:
        click.echo(json_lib.dumps(report, indent=2, ensure_ascii=False))
        return
    for entry in report:
        click.echo(f"▸ {entry['query']}")
        if entry.get('error'):
            click.echo(f"  ! erreur : {entry['error']}")
        for line in entry['plan']:
            click.echo(f"  {line}")
    failures = sum(1 for entry in report if entry.get('error'))
    click.echo(f"{len(report)} requêtes, {failures} erreur(s)")


def register_commands(application):
    """Attache les commandes CLI à l'application (appelé par create_app)."""
    application.cli.add_command(seed_group)
    application.cli.add_command(retention_group)
    application.cli.add_command(perf_group)
