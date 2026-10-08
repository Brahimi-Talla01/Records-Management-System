# UniArchive — Dockerisation

> Document n°6 — Stack complète conteneurisée : PostgreSQL + Redis + Backend + Frontend.

---

## 1. Architecture

```
                        http://localhost:8080
                                │
                    ┌───────────▼────────────┐
                    │  frontend (Nginx)      │
                    │  - build Vite statique │
                    │  - SPA fallback        │
                    │  - proxy /api → :5000  │
                    └───────┬────────────────┘
                            │ réseau interne Docker
        ┌───────────────────▼────────────────────┐
        │  backend (gunicorn, 2 workers)         │
        │  - sessions opaques (cookie HTTPOnly)  │
        └───────┬───────────────────┬────────────┘
                │                   │
     ┌──────────▼────────┐  ┌───────▼────────┐
     │  db (Postgres 16) │  │  redis 7       │
     │  volume db_data   │  │  sessions+rl   │
     └───────────────────┘  └────────────────┘
```

**Même origine** : le navigateur ne parle qu'à Nginx (port 8080) → cookies de session sans configuration CORS ni SameSite=None. C'est le schéma recommandé pour la production.

## 2. Fichiers ajoutés

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` (racine) | 4 services + volume, variables d'env, healthchecks |
| `.env.example` (racine) | Modèle de configuration compose |
| `backend/Dockerfile` | python:3.12-slim + pip install + entrypoint |
| `backend/docker-entrypoint.sh` | Attente DB → `db.create_all()` → seed idempotent → gunicorn |
| `backend/.dockerignore` | Exclut venv/, .env, tests, migrations… |
| `frontend/Dockerfile` | Multi-stage : node:20-alpine (build) → nginx:1.27-alpine |
| `frontend/nginx.conf` | SPA fallback, proxy `/api` vers `backend:5000`, cache assets, sécurité |
| `frontend/.dockerignore` | Exclut node_modules/, dist/, .env |

## 3. Utilisation

```bash
# Configurer (optionnel : les défauts fonctionnent en local)
cp .env.example .env

# Construire et démarrer
docker compose up -d --build

# Suivre le backend — IMPORTANT en dev : le code 2FA y est loggé (pas de SMTP)
docker compose logs -f backend

# Arrêter
docker compose down
docker compose down -v   # + supprimer les données PostgreSQL
```

L'application est servie sur **http://localhost:8080**. Le super admin est créé
au démarrage du backend à partir des variables `ADMIN_*` du `.env` (bootstrap
12-factor, ci-dessous) — avec les défauts : `admin` / `Admin@2024` (**à changer
impérativement**). Pour tester avec un jeu de documents prêt à l'emploi :
`SEED_DEMO_DATA=true` dans le `.env` (base vierge) ou, sur une base déjà
seedée en production-like : `docker compose exec backend flask seed demo-data
--force`.

### Bootstrap du super admin (12-factor)

Les identifiants du super admin ne sont plus codés en dur : ils viennent de
l'environnement (`backend/.env` ou `.env` racine pour compose) et le compte est
créé au démarrage du conteneur **seulement s'il n'existe pas déjà**
(idempotent). Variables : `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`ADMIN_FULL_NAME`, `ADMIN_MATRICULE`.

- Validation identique à l'API : mot de passe ≥ 8 caractères avec majuscule,
  minuscule et chiffre ; email bien formé.
- **Garde production** : en `FLASK_ENV=production` sans `ADMIN_PASSWORD`, le
  conteneur **refuse de démarrer** (aucun mot de passe par défaut implicite).
- `SEED_DEMO_DATA=true` installe au démarrage un jeu de démonstration
  (6 documents avec de vrais PDF, étiquettes, versions et rétention) —
  uniquement si la base ne contient **aucun document réel** ; jamais en
  production (`flask seed demo-data`, contournement explicite par `--force`).

## 4. Points de configuration notables

| Variable | Défaut | Rôle |
|---|---|---|
| `APP_PORT` | 8080 | Port d'accès à l'app |
| `FLASK_ENV` | production | Config Flask chargée |
| `SESSION_COOKIE_SECURE` | false | **true obligatoire derrière HTTPS** |
| `FORCE_HTTPS` | false | Redirection HTTPS Flask (uniquement derrière un terminateur TLS transmettant `X-Forwarded-Proto`) |
| `MAIL_SERVER` | *(vide)* | Vide = mode dev : **code 2FA affiché dans `docker compose logs backend`** |
| `REDIS_URL` (interne) | redis://redis:6379/0 | Sessions ; rate limiting sur la DB 1 |
| `GUNICORN_WORKERS` | 2 | Nombre de workers gunicorn (par défaut 2 ; formule conseillée `2×CPU+1` en charge réelle) |
| `VITE_API_URL` | `/api` | URL compilée dans le bundle frontend au **build** (relative = même origine via Nginx) |
| `BEHIND_PROXY` | `true` (interne) | Active `ProxyFix` pour lire `X-Forwarded-*` derrière Nginx |
| `FRONTEND_URL` | http://localhost:8080 | Origin autorisée (cookies/redirects) — à passer en HTTPS en prod |
| `ADMIN_USERNAME` | `admin` | Login du super admin de bootstrap (créé au démarrage si absent) |
| `ADMIN_EMAIL` | admin@uniarchive.edu | Email du super admin (validation API) |
| `ADMIN_PASSWORD` | *(défaut dev)* | **Obligatoire en `FLASK_ENV=production`** (sinon le démarrage est refusé) |
| `ADMIN_FULL_NAME` / `ADMIN_MATRICULE` | Défauts dev | Profil du super admin |
| `SEED_DEMO_DATA` | false | `true` = documents de démonstration au démarrage (base sans documents réels uniquement) |

## 5. Corrections effectuées pendant la mise en place

1. **Seed non exécuté** : `import init_db` n'appelait pas `init_database()` (garde `__main__`) → appel explicite dans l'entrypoint.
2. **Redirection HTTPS intempestive** : Talisman forçait HTTPS en config production, donc boucle de redirection sur le stack HTTP local → `FORCE_HTTPS` (false par défaut), headers de sécurité conservés, `ProxyFix` activé (`BEHIND_PROXY=true`) pour un fonctionnement correct derrière Nginx.
3. **Code 2FA invisible dans les logs** : en production, le logger Flask n'émet que ERROR+ → le mode dev sans SMTP utilise `print(flush=True)`, capturé par gunicorn.

## 6. Passage en production réelle (checklist)

- [ ] `SECRET_KEY` long et aléatoire dans `.env` (jamais le défaut)
- [ ] `POSTGRES_PASSWORD` fort ; accès DB non exposé hors du réseau Docker
- [ ] TLS devant Nginx (Traefik/Caddy/Nginx hôte) puis `SESSION_COOKIE_SECURE=true`, `FORCE_HTTPS=true`, `FRONTEND_URL=https://votre-domaine`
- [ ] SMTP configuré (`MAIL_*`) — sinon personne ne peut se connecter (2FA par email)
- [ ] Changer le mot de passe admin du seed dès la première connexion
- [ ] Sauvegardes du volume `db_data` (dump pg_dump planifié)
