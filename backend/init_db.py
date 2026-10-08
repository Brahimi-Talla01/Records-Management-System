"""
Initialisation de la base de données — point d'entrée historique.

Depuis P0.6 (plan 07), la logique vit dans `app/seeds.py` (idempotente) et est
exposable en CLI :

    flask seed all          # équivalent de `python init_db.py`
    flask seed admin        # uniquement le compte admin

Ce module reste l'entrée utilisée par `docker-entrypoint.sh` et par un
démarrage manuel ; il ne fait que déléguer.
"""

import os

from app import create_app
from app import seeds
from extensions import db


def init_database():
    """Crée les tables si besoin, puis applique tous les seeds (idempotent)."""
    # En conteneur : FLASK_ENV=production — en local : development
    app = create_app(os.environ.get('FLASK_ENV', 'development'))

    with app.app_context():
        print("Initialisation de la base de données...")
        db.create_all()

        labels = {
            'roles': 'rôles',
            'folders': 'dossiers',
            'doctypes': 'types de documents',
            'departments': 'départements',
            'admin': 'compte admin',
            'demo': 'comptes démo',
        }
        results = seeds.seed_all(
            username=os.environ.get('ADMIN_USERNAME') or None,
            password=os.environ.get('ADMIN_PASSWORD') or None,
        )
        for key, count in results.items():
            label = labels.get(key, key)
            if count:
                print(f"   ✓ {label} : {count} ligne(s) créée(s)")
            else:
                print(f"   - {label} : déjà en place")

        if results.get('admin'):
            cfg = seeds.admin_bootstrap_config()
            print("\n" + "=" * 60)
            print("   Super admin de bootstrap créé :")
            print(f"   Username: {cfg['username']}")
            print("   Password: (valeur de ADMIN_PASSWORD — ne pas l'afficher)")
            print("   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !")
            print("=" * 60)

        print("\n✅ Initialisation terminée avec succès !\n")


if __name__ == '__main__':
    init_database()
