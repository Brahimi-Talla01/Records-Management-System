# UniArchive — Backend

API Flask du projet UniArchive (gestion d'archives numériques multi-campus).

## Démarrage

### Docker (recommandé)

```bash
docker compose up -d --build        # stack complète (db, redis, backend, scheduler, frontend)
docker compose logs -f backend      # le code 2FA est loggé si aucun SMTP n'est configuré
```

L'application est servie sur `http://localhost:8080` (Nginx proxifie `/api`).
Un service `scheduler` exécute le job de rétention toutes les 24 h
(`RETENTION_INTERVAL_SECONDS` pour changer l'intervalle).

### Développement local

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export FLASK_ENV=development DATABASE_URL=sqlite:///instance/uniarchive.db
flask run
```

## Base de données

L'entrypoint Docker exécute `create_all()` puis Alembic (stamp baseline
`23042faea7a9` → migrations). Sur une base préexistante, seule la migration
Alembic s'applique.

```bash
flask db upgrade                    # appliquer les migrations
flask db downgrade -- -1            # revenir d'une révision
```

Révisions : `e5f0a1b2c3d4` (index P0) → `f1a2b3c4d5e6` (campus/réglages P1) →
`b4c5d6e7f8a9` (full-text P4) → `c5d6e7f8a9b0` (rétention P5).

## Seeds

```bash
flask seed all        # institution, campus PRINCIPAL, réglages, rôles, dossiers,
                      # types, départements, admin, comptes démo (idempotent)
flask seed roles | doctypes | departments | admin | demo | …
```

Comptes livrés : `admin` / `Admin@2024` (super admin) et `prof`, `secretaire`,
`etudiant` / `Demo@2024`.

## Rétention (P5)

```bash
flask retention run --dry-run    # simulation (préavis, archivage, purge)
flask retention run              # exécution réelle
flask retention status           # compteurs + dernier rapport
```

Politique pilotée par les réglages `archives.retention_*` (API
`/api/settings`) : préavis (`retention_warning_days`), archivage automatique
(`retention_auto_archive`), purge (`retention_purge_after_days`).
Déclenchement manuel : `POST /api/admin/retention/run` (super admin).

## OCR (P6)

Réglage `features.ocr_enabled` (`PUT /api/settings`), **éteint par défaut**. Activé, il extrait le
texte à chaque dépôt pour remplir `document.ocr_text` (poids C du vecteur de recherche) :

- **PDF** : couche texte native (`pypdf`, jusqu'à `OCR_MAX_PDF_PAGES` pages) ;
- **images** (png/jpeg/tiff) : Tesseract (`OCR_LANGUAGES`, défaut `fra+eng`), binaire installé
  dans l'image Docker (`tesseract-ocr` + `tesseract-ocr-fra`) ; délai borne par
  `OCR_TIMEOUT_SECONDS` (30 s).

L'extraction est **best-effort** : moteur absent, fichier illisible ou délai dépassé → `ocr_text`
reste vide et le dépôt réussit quand même.

## Tests & qualité

```bash
venv/bin/python -m pytest                 # suite complète (SQLite en mémoire)
venv/bin/ruff check .                     # lint (E9 + F)
npx pyright@1.1.414                       # typage statique, 0 erreur exigé
pytest --cov=app --cov-report=term        # couverture
```

La CI (`.github/workflows/ci.yml`) rejoue exactement ces étapes et ajoute
PostgreSQL 16 + Redis 7 + `docker build`.

## Documentation API

Voir `../assets/08_api_reference.md` (contrat complet : routes, paramètres,
erreurs, exemples).
