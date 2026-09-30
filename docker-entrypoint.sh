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

# 2. Tables (create_all idempotent) + données de base (seed idempotent)
python - <<'EOF'
from app import create_app
from extensions import db
import importlib
import os

flask_env = os.environ.get('FLASK_ENV', 'production')
app = create_app(flask_env)

with app.app_context():
    print("Création des tables (create_all)…")
    db.create_all()

    # Seed uniquement en l'absence de données
    from app.models.role import Role
    if Role.query.count() == 0:
        print("Seed des données de base…")
        import init_db
        init_db.init_database()  # appel explicite (le module n'exécute rien à l'import)
    else:
        print("Données déjà présentes — seed ignoré")

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
