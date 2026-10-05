#!/bin/bash
set -e

echo "=== UniArchive backend — démarrage ==="

# 1. Attendre PostgreSQL (le check dépend de DATABASE_URL)
python - <<'EOF'
import os
import sys
import time

import psycopg2

url = os.environ.get('DATABASE_URL', '')
if not url:
    print("DATABASE_URL manquant", file=sys.stderr)
    sys.exit(1)

if url.startswith('postgres://'):
    url = 'postgresql://' + url[len('postgres://'):]

for attempt in range(60):
    try:
        conn = psycopg2.connect(url, connect_timeout=3)
        conn.close()
        print("PostgreSQL prêt")
        sys.exit(0)
    except Exception as exc:
        print(f"Attente PostgreSQL ({attempt + 1}/60): {exc.__class__.__name__}")
        time.sleep(1)

print("PostgreSQL injoignable après 60s", file=sys.stderr)
sys.exit(1)
EOF

# 2. Tables (create_all idempotent) + migrations Alembic + données de base (seed)
python - <<'EOF'
from app import create_app
from extensions import db
import os

flask_env = os.environ.get('FLASK_ENV', 'production')
app = create_app(flask_env)

with app.app_context():
    print("Création des tables (create_all)…")
    db.create_all()

    # Bascule sur Alembic (P0.9) : `create_all` crée les tables sans
    # versionnement, donc si `alembic_version` est absent on stamp la révision
    # de baseline (23042faea7a9) puis on applique UNIQUEMENT les migrations
    # suivantes (migration 2 = index, `IF NOT EXISTS` → idempotent).
    # À partir de P1, les nouvelles tables arrivent par migration.
    import sqlalchemy as sa
    from flask_migrate import stamp, upgrade

    inspector = sa.inspect(db.engine)
    if inspector.has_table('user_account') and not inspector.has_table('alembic_version'):
        print("Alembic — baseline stampée (23042faea7a9)")
        stamp(revision='23042faea7a9')

    print("Alembic — application des migrations…")
    upgrade()

    # 1) Bootstrap du super admin : identifiants via ADMIN_* (variables
    #    d'environnement), idempotent — ne fait rien si le compte existe déjà.
    #    Refus en production sans ADMIN_PASSWORD (garde seeds.py).
    # 2) SEED_DEMO_DATA=true : comptes de démo (idempotents) puis documents de
    #    démonstration — installés seulement si la base ne contient QUE des
    #    documents de démo (ou aucun) : un vrai document présent = refus, pour
    #    ne jamais mélanger démo et données réelles.
    from app import demo_data
    from app import seeds
    from app.models.document import Document
    from app.models.role import Role

    # 1) Données de base d'abord (rôles, campus, dossiers, TYPES, départements,
    #    réglages, comptes démo) : seed_admin dépend d'une partie de ce socle et
    #    ne doit jamais passer avant (sinon le test « rôles présents » sauterait
    #    le reste du seed).
    if Role.query.count() == 0:
        print("Seed des données de base…")
        import init_db
        init_db.init_database()  # appel explicite (le module n'exécute rien à l'import)
    else:
        print("Données de base déjà présentes — seed ignoré")

    # 2) Bootstrap du super admin : identifiants via ADMIN_* (variables
    #    d'environnement), idempotent — 0 si le compte existe déjà. Refus en
    #    production sans ADMIN_PASSWORD (garde seeds.py).
    print("Bootstrap du super admin (ADMIN_*)…")
    seeds.seed_admin()

    # 3) SEED_DEMO_DATA=true : documents de démonstration — installés seulement
    #    si la base ne contient QUE des documents de démo (ou aucun) : un vrai
    #    document présent = refus, pour ne jamais mélanger démo et données réelles.
    if os.environ.get('SEED_DEMO_DATA', '').strip().lower() == 'true':
        demo_titles = {title for title, *_ in demo_data.DEMO_DOCUMENTS}
        existing = {row[0] for row in db.session.query(Document.title).all()}
        intruders = existing - demo_titles
        if intruders:
            print("SEED_DEMO_DATA : documents réels présents en base — "
                  "données de démo non installées")
        else:
            print("SEED_DEMO_DATA : installation des données de démonstration…")
            try:
                created = demo_data.seed_demo_content()
                print(f"   ✓ documents de démo : {created['documents']} créé(s), "
                      f"{created['tags']} étiquette(s)")
            except Exception as exc:  # noqa: BLE001 — le démarrage ne doit pas casser
                print(f"   ⚠️  données de démo ignorées : {exc}")
    else:
        print("SEED_DEMO_DATA non activé — comptes et documents de démo ignorés")

print("Base prête")
EOF

# 3. Serveur WSGI de production
WORKERS="${GUNICORN_WORKERS:-2}"
echo "Démarrage gunicorn (${WORKERS} workers)…"
exec gunicorn --bind 0.0.0.0:5000 \
    --workers "$WORKERS" \
    --threads 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    wsgi:app
