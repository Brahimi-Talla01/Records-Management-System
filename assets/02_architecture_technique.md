# UniArchive — Architecture technique

> Document d'audit n°2/4 — voir aussi : [01_presentation_projet.md](01_presentation_projet.md) · [03_etat_avancement.md](03_etat_avancement.md) · [04_analyse_recommandations.md](04_analyse_recommandations.md)

---

## 1. Vue d'ensemble

```
┌─────────────────────┐      HTTP/JSON (cookies session + CSRF)  ┌──────────────────────┐
│  Frontend React 19  │  ──────────────────────────────────────► │  Backend Flask 3     │
│  Vite 7 + Tailwind4 │                                          │  SQLAlchemy 2        │
│  SPA (6 écrans)     │  ◄────────────────────────────────────── │  Session + 2FA email │
└─────────────────────┘                                          └──────────┬───────────┘
                                                                            │
                                          ┌─────────────────────────────────┼────────────────┐
                                          │                                 │                │
                               ┌──────────▼───────────┐          ┌──────────▼───────┐  ┌─────▼──────┐
                               │  PostgreSQL (Neon)   │          │ Redis (sessions, │  │  SMTP      │
                               │  + migrations Alembic│          │  rate limiting)  │  │  (2FA)     │
                               └──────────────────────┘          └──────────────────┘  └────────────┘
```

- **Frontend** : SPA React (dossier `frontend/`), **un seul client HTTP** `src/lib/api.js` (axios, cookies de session + header CSRF) ; les appels sont groupés par domaine dans `src/features/<domain>/api.js`.
- **Backend** : API REST Flask (dossier `backend/`), **session opaque en cookie HTTPOnly + CSRF double-submit** (`app/services/session_service.py`), emails asynchrones (`Flask-Mail` + threads).
- **Base de données** : PostgreSQL hébergé sur Neon (cf. `config.py`), migrations via Flask-Migrate/Alembic (`backend/migrations/`).
- **Conteneurisation** : `docker-compose.yml` (PostgreSQL 16 + Redis 7 + backend gunicorn + frontend Nginx, app sur `:8080`).

## 2. Stack détaillée

### Backend (`backend/requirements.txt`)
| Composant | Techno | Rôle |
|---|---|---|
| Framework web | Flask 3.0.0 | API REST |
| ORM | Flask-SQLAlchemy 3.1 / SQLAlchemy 2.0.43 | Modèles + requêtes |
| Migrations | Flask-Migrate 4.0.5 / Alembic 1.13.1 | Versionnement du schéma |
| Auth | Session opaque maison + Flask-Bcrypt 1.0.1 | Cookies de session, hash mots de passe |
| Rate limiting | Flask-Limiter 3.8.0 (stockage `memory://` ou Redis) | 5 logins/min, 10 verify-2FA/min, 200 req/min |
| Sécurité HTTP | Flask-Talisman 1.1.0 | Headers de sécurité, HTTPS optionnel |
| Email | Flask-Mail 0.9.1 | Codes 2FA, reset password |
| Serveur prod | gunicorn 23.0 | WSGI (`docker-entrypoint.sh`) |
| Cache/sessions | redis 5.0.8 | Sessions + rate limiting (fallback mémoire) |
| Drivers DB | psycopg2-binary 2.9.9 | PostgreSQL |
| Divers | Flask-Cors 4.0, python-dotenv | CORS, configuration |

### Frontend (`frontend/package.json`)
| Composant | Techno | Rôle |
|---|---|---|
| UI | React 19.1 + Vite 7.1 | SPA |
| Routing | react-router-dom 7.9 | Navigation (voir `src/Routes.jsx`) |
| Style | Tailwind CSS 4.1 (+ plugins forms, animate, fluid-type) | Design system |
| État | Zustand 5 (`features/auth/authStore.js`) + TanStack Query 5 (`app/queryClient.js`) | État client + cache serveur |
| HTTP | axios 1.12 (`src/lib/api.js`) | Client unique, intercepteurs CSRF/401 |
| Graphiques | recharts 3.2, d3 7.9 | Statistiques dashboard |
| Formulaires | react-hook-form 7.63 | Formulaires |
| UI divers | framer-motion, lucide-react, radix-ui | Animations, icônes |

## 3. Organisation des dossiers

### Backend (`backend/`)

```
backend/
├── wsgi.py                  # Point d'entrée : create_app(FLASK_ENV) ; app.run(0.0.0.0:5000) en dev
├── config.py                # Config Dev/Prod/Testing (DB, cookies de session, CSRF, upload, mail, Redis)
├── extensions.py            # Instances partagées : db, migrate, bcrypt, cors, mail, limiter
├── init_db.py               # Script de seed (rôles, départements, dossiers, types, admin)
├── simple_test.py           # Test manuel de connexion DB
├── requirements.txt         # Dépendances (Flask 3, SQLAlchemy 2, Flask-Limiter, Talisman, gunicorn, redis…)
├── Dockerfile               # Image python:3.12-slim, deps puis code
├── docker-entrypoint.sh     # Attend PostgreSQL → create_all → stamp Alembic → migrations → seed → gunicorn wsgi:app
├── .env / .env.example      # Variables d'env (.env ignoré par .gitignore)
├── instance/                # Artefacts locaux : uniarchive.db (SQLite de dev), requirements.txt
├── README.md                # ✅ P5 : démarrage, migrations, seeds, rétention (CLI/API), tests, doc API
├── migrations/              # Alembic : baseline 23042faea7a9 + e5f0a1b2c3d4 (24 index, P0) + f1a2b3c4d5e6 (campus/réglages, P1) + b4c5d6e7f8a9 (full-text, P4) + c5d6e7f8a9b0 (rétention, P5)
├── ruff.toml                # Linter (règles E9 + F) — utilisé par la CI
├── requirements-dev.txt      # pytest, pytest-cov, ruff
├── pyrightconfig.json        # Typage statique (miroir de la config racine)
├── .github/workflows/ci.yml  # CI : ruff + pyright + pytest (SQLite/Postgres/Redis) + docker build
├── tests/                   # 20 fichiers pytest (300 tests) + conftest.py (harness)
└── app/
    ├── __init__.py          # create_app() : extensions, Talisman, ProxyFix, limiter, session store, blueprints,
    │                        #   /health, enveloppe d'erreur, hook d'audit, CLI, enregistrement des modèles
    ├── errors.py            # Enveloppe {"error","code","details"} + handlers (P0.4)
    ├── serializers.py       # ok()/serialize()/parse_pagination()/paginate() (P0.5)
    ├── seeds.py             # Seeds idempotents appelés par `flask seed` (P0.6)
    ├── scope.py             # Périmètre multi-campus : is_super_admin, apply_campus_scope (P1)
    ├── settings/            # Registre typé + SettingService (défaut→global→campus, cache) (P1)
    ├── campuses/            # Institution & campus : services + routes /api/institution, /api/campuses (P1)
    ├── cli.py               # Commandes Flask : seed institution|campuses|settings|roles|doctypes|departments|admin|demo
    ├── auth/
    │   ├── routes.py        # Blueprint /api/auth : login, verify-2fa, me, logout, sessions, password, 2fa, security-alerts
    │   ├── services.py      # AuthService : authentification, 2FA, reset, force brute, audit
    │   ├── session_auth.py  # @session_required, get_current_user, validation CSRF (remplace @jwt_required)
    │   └── decorators.py    # role_required, admin_required, department_access_required
    ├── users/
    │   ├── routes.py        # Blueprint /api/users : CRUD, import/export CSV, stats, reset-password
    │   ├── services.py      # UserService : logique métier
    │   └── repositories.py  # UserRepository : accès aux données
    ├── documents/           # ✅ P2 : routes, services, repositories, validation (CRUD, versions, download, bulk, export)
    ├── folders/             # ✅ P2 : arborescence, chemins, déplacement (anti-cycle)
    ├── referentials/        # ✅ P2 : départements, types de documents, tags, rôles (CRUD)
    ├── permissions/         # ✅ P3 : routes /api/permissions + décorateur @require_permission
    ├── storage/             # ✅ P2 : interface Storage + implémentation locale (chemins sûrs, SHA-256)
    ├── dashboard/           # ✅ P4 : 5 agrégats /api/dashboard/* (summary, activity, expiring, uploads, recent-documents)
    ├── search/              # ✅ P4 : /api/search (full-text PG + fallback ILIKE, facettes, snippet) + /api/search/history
    ├── notifications/       # ✅ P4 : routes /api/notifications (liste, unread-count, read, read-all, delete)
    ├── audit/               # ✅ P5 : GET /api/audit + /api/audit/export (CSV), scoping D6
    ├── retention/           # ✅ P5 : /api/admin/retention/status|run|reports (super admin)
    ├── services/
    │   ├── session_service.py     # MemorySessionStore / RedisSessionStore, create/get/revoke/list sessions + CSRF
    │   ├── email_service.py       # EmailService : envoi des codes 2FA et reset password
    │   ├── audit_service.py       # Journal d'audit : log() + filet after_request sur les mutations (P0.8)
    │   ├── permission_service.py  # ✅ P3 : moteur D6 (campus, héritage dossiers, rôle, confidentialité)
    │   ├── notification_service.py # ✅ P4 : création par événements (dépôt, droit accordé) + lecture/marquage
    │   └── retention_service.py    # ✅ P5 : cycle préavis/archivage/purge + status + rapport
    └── models/              # 19 fichiers modèles SQLAlchemy (18 classes + table d'association document_tag)
        ├── user.py, role.py, department.py, folder.py, doc_type.py, document.py
        ├── document_tag.py, document_version.py, tag.py
        ├── user_folder_right.py, user_document_right.py, role_folder_right.py, role_document_right.py
        ├── audit.py, security_alert.py, two_factor.py, password_reset.py
        ├── notification.py, search_history.py
        ├── retention_report.py  # ✅ P5 : rapports d'exécution du job de rétention
        └── __init__.py      # Imports centralisés (ordre = dépendances FK)
```

### Frontend (`frontend/`)

```
frontend/
├── index.html               # Point d'entrée Vite
├── vite.config.js           # Plugins react + @tailwindcss/vite
├── eslint.config.js
├── package.json             # uniarchive — React 19, Vite 7, Tailwind 4, react-router 7…
├── Dockerfile               # Étape 1 : build Vite (ARG VITE_API_URL=/api) → Étape 2 : nginx:1.27-alpine
├── nginx.conf               # Sert dist/, proxifie /api → backend:5000 (SPA fallback + cache assets)
├── .env / .env.example      # VITE_API_URL (frontend/.env ignoré par .gitignore)
├── public/                  # logo.png, logo-rb.png, vite.svg
└── src/
    ├── main.jsx             # createRoot → <Providers><App/>
    ├── App.jsx              # → <Routes/>
    ├── Routes.jsx           # BrowserRouter : routes lazy + gardes RequireAuth/RequireRole/RequireScope, 403, 404
    ├── app/
    │   ├── providers.jsx    # QueryClientProvider (Zustand n'a pas besoin de provider)
    │   └── queryClient.js   # Configuration TanStack Query (retry, staleTime…)
    ├── lib/
    │   ├── api.js           # Client axios UNIQUE : baseURL VITE_API_URL, withCredentials, interceptor CSRF, redirection 401
    │   └── …                # errors (codes → FR), validate (zod en frontière, Q2), queryKeys, sanitize, download, upload, formatters
    ├── features/            # Architecture par features (API + hooks + types + guards)
    │   ├── auth/            # api.js, useAuth.js, authStore.js (Zustand), permissions.js (isAdmin/isSuperAdmin), types.js, index.js
    │   │   └── components/  # ProtectedRoute.jsx, RoleGuard.jsx, guards.jsx (RequireAuth/RequireRole/RequireScope)
    │   ├── users/           # api.js, useUsers.js, types.js, index.js
    │   ├── documents/ · folders/ · referentials/   # F3 bibliothèque + F6 écriture admin
    │   ├── search/ · dashboard/ · notifications/   # F5 / F2
    │   ├── settings/ · campuses/ · audit/ · retention/ · permissions/  # F6 administration
    │   └── campuses/campusStore.js  # périmètre de campus (A4, super admin)
    ├── components/          # ErrorBoundary, ScrollToTop, AppIcon, AppImage
    │   └── ui/              # Button, Input, Select, Checkbox, Header, Breadcrumb, Modal, ConfirmDialog, Toast,
    │                        # CampusScopeBar (bandeau de périmètre A4), Badge, Skeleton, EmptyState, DocumentActionToolbar
    ├── styles/              # index.css (Tailwind)
    ├── utils/               # cn.js (clsx + tailwind-merge)
    ├── assets/              # react.svg
    └── pages/
        ├── login/           # LoginForm, TwoFactorAuth, ForgotPassword, SecurityBadges, LanguageSelector, UniversityBranding
        ├── dashboard/       # StatsOverview, RecentDocuments, RecentActivity, NotificationCenter, QuickActionPanel, SystemStatus
        ├── document-library/# FolderNavigation, DocumentFilters, DocumentTable, DocumentPreviewModal, BulkActionBar
        ├── document-detail/ # fiche document (versions, droits effectifs, étiquettes, aperçu)
        ├── document-upload/ # UploadZone, UploadProgress, DocumentMetadataForm, ScannerIntegration
        ├── advanced-search/ # SearchForm, SearchResults, SearchFilters, SearchHistory (SavedSearches retiré : R6‑01)
        ├── account/ · notifications/ · reset-password/   # F1/F2 (profil, 2FA, appareils, alertes)
        ├── user-management/ # UserTable, UserFilters, UserActions, UserModal, ActivityPanel (journal réel)
        ├── campuses/ · settings/ · referentials/ · permissions/ · audit/ · retention/  # F6 administration
        ├── Forbidden.jsx · NotFound.jsx
        └── tests (`*.test.jsx|js` colocalisés, Vitest + RTL + MSW)
```

> Les six dossiers de `pages/*/` contiennent chacun un `index.jsx` (page) + un sous-dossier `components/`.

## 4. Modèle de données (19 modèles — `backend/app/models/`)

### Structure multi-campus (P1)
- **`Institution`** (`institution.py`) : ligne unique (nom, sigle, logo, locale, timezone) — branding public.
- **`Campus`** : site physique (code unique, `is_active`) ; **aucune suppression physique**.
- **`Setting`** : réglage clé/valeur typé (`scope` global|campus, `campus_id`) ; unicité par index partiels.
- `campus_id` sur `Department` (NOT NULL), `Folder` (nullable = global), `UserAccount` (nullable = accès global) et `Document` (NOT NULL, dénormalisé) ; `UNIQUE(campus_id, code)` sur les départements.

### Cœur fonctionnel
- **`UserAccount`** (`user.py`) : matricule unique, username, email, `password_hash` (bcrypt), `is_active`, `two_fa_enabled`, `preferences` (JSON), FK `role_id` + `department_id`.
- **`Role`** : Admin, Prof, Etudiant, Secretaire (seed `init_db.py`).
- **`Department`** : code unique, rattaché optionnellement à un `Folder`.
- **`Folder`** : arborescence auto-référencée (`parent_folder_id`).
- **`Document`** : titre, description, `status`, `confidentiality_level`, `retention_period`, `is_encrypted`, `ocr_text`, `size_bytes` ; FK department/doc_type/folder ; relations tags + versions ; `search_vector` (tsvector PostgreSQL, alimenté par trigger — P4).
- **`DocType`** : types (Thèse, Mémoire, Rapport, Article, Cours, Administratif) avec `default_retention_days`.
- **`Tag`** + table d'association `document_tag` (many-to-many).
- **`DocumentVersion`** : `version_number`, `storage_url`, `mime_type`, `checksum`, `change_note`.

### Droits d'accès (moteur D6, P3)
- `UserFolderRight`, `UserDocumentRight` : droits par utilisateur (view/download/edit/delete).
- `RoleFolderRight`, `RoleDocumentRight` : droits par rôle.
- Résolution « première règle gagnante » : campus → explicite → héritage dossier → rôle → admin → confidentialité (voir [03](03_etat_avancement.md) §2.7).

### Traçabilité & sécurité
- **`AuditLog`** : action, object_type/object_id, `details` JSON, FK user/document ; helper `log_action()` ; consultable et exportable en CSV depuis P5 (`list_entries`/`to_csv`, scoping D6).
- **`RetentionReport`** (✅ P5) : un rapport par exécution du job (`ran_at`, `dry_run`, `warnings_sent`, `archived`, `purged`, `triggered_by`, `details` JSON).
- **`SecurityAlert`** : type, sévérité, résolution (utilisé par la détection de tentatives multiples).
- **`TwoFactorCode`** : code 6 chiffres, expiration 10 min, max 3 tentatives.
- **`PasswordResetToken`** : token `secrets.token_urlsafe(32)`, expiration 1 h.
- **`Notification`**, **`SearchHistory`** : ✅ P4 — notifications in-app par événements (dépôt, droit accordé) et historique de recherche (dédupliqué, par utilisateur) ; type `retention_warning` (✅ P5, préavis de fin de conservation, dédupliqué par utilisateur + document).

## 5. API REST implémentée

### Authentification (`/api/auth/*` — `app/auth/routes.py`) ✅
| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/login` | Auth username/email + mot de passe → **2FA systématique** (envoi code par email, rate-limit 5/min) |
| POST | `/verify-2fa` | Vérification du code → **création de session opaque** : cookies `uniarchive_session` (HTTPOnly) + `uniarchive_csrf` |
| GET | `/me` | Profil courant (dépend du cookie de session) |
| POST | `/logout` | Révoque réellement la session côté serveur + efface les cookies |
| POST | `/session/extend` | Prolonge la session glissante (TTL 7 j) |
| GET / DELETE | `/sessions` | Liste les sessions de l'utilisateur / révoque toutes les sessions |
| POST | `/sessions/revoke` | Révoque une session précise |
| POST | `/forgot-password` / `/reset-password` | Reset par token email |
| POST | `/change-password` | Changement avec vérification de l'ancien mot de passe |
| POST | `/2fa/enable` / `/2fa/confirm` / `/2fa/disable` | Gestion du 2FA du compte |
| GET | `/security-alerts`, PUT `/security-alerts/<int:alert_id>/resolve` | Alertes de sécurité (chemin correctement déclaré `<int:alert_id>`) |

> Il n'y a **plus de `/refresh`** : la session est serveur (Redis/mémoire via `app/services/session_service.py`), pas de token client.

### Utilisateurs (`/api/users/*` — `app/users/routes.py`) ✅
CRUD complet avec pagination/filtres (`UserService` + `UserRepository`), `POST /import` (CSV), `GET /export` (CSV), `GET /statistics`, `POST /<id>/reset-password`, `GET /roles`, `GET /departments`. Les routes de mutation sont protégées par `@session_required` + `@admin_required`.

### Documents & dossiers (`/api/documents/*`, `/api/folders/*`, `/api/departments|doc-types|tags|roles` — P2) ✅
CRUD complet (upload multipart avec magic bytes, listing filtré/paginé, PATCH, soft-delete/restore, bulk, export CSV, tags), versions (upload N+1, download streamé, restauration, preview), dossiers (tree, déplacement anti-cycle) et référentiels. Contrôle d'accès documentaire par `@require_permission` (P3).

### Permissions (`/api/permissions/*` — P3) ✅
Droits effectifs (`explain` par action avec la règle appliquée), liste des accords, octroi/révocation (document/dossier × utilisateur/rôle), `POST /check` (débogage admin).

### Recherche (`/api/search/*` — P4) ✅
`GET /search` : full-text PostgreSQL (`tsvector` français + `pg_trgm`), tri pertinence, extrait surligné, facettes (types/départements/statuts/confidentialités), `took_ms` ; fallback `ILIKE` ailleurs. `GET|DELETE /search/history` : historique utilisateur dédupliqué.

### Tableau de bord (`/api/dashboard/*` — P4) ✅
`summary`, `activity`, `expiring`, `uploads`, `recent-documents` — agrégats SQL bornés au campus, adaptés au rôle (super admin global, admin de campus, utilisateur).

### Notifications (`/api/notifications/*` — P4) ✅
Liste paginée (`unread=1`), `unread-count` (badge), `read` / `read-all`, suppression ; créées par les événements dépôt de document, octroi de droits et préavis de rétention (P5).

### Audit & rétention (P5) ✅
`GET /api/audit` (journal paginé, filtres action/object_type/user_id/from/to) + `GET /api/audit/export` (CSV, plafonné à 10 000 lignes) — admin de campus borné à son campus, 403 inter-campus. `GET|POST /api/admin/retention/status|run|reports` (super admin) : compteurs, exécution manuelle (`dry_run` possible), historique des rapports. Job `flask retention run` + service compose `scheduler`. Référence détaillée : [08_api_reference.md](08_api_reference.md).

## 6. Sécurité en place

- Mots de passe bcrypt (`BCRYPT_LOG_ROUNDS = 12`), validation de force (8+, majuscule, minuscule, chiffre).
- 2FA par email **à chaque connexion** (design volontairement strict).
- Détection de force brute : ≥ 5 échecs en 15 min → `SecurityAlert` (basée sur `AuditLog`).
- Session opaque côté serveur (`session_service.py`) : cookie `uniarchive_session` **HTTPOnly** + cookie CSRF `uniarchive_csrf` (double-submit vérifié par `session_auth._validate_csrf` sur les mutations), TTL glissant 7 j, révocation multi-sessions.
- Décorateurs : `session_required`, `get_current_user` (`auth/session_auth.py`) ; `role_required`, `admin_required`, `department_access_required` (`auth/decorators.py`).
- Rate limiting Flask-Limiter : `5/min` sur `/login`, `10/min` sur `/verify-2fa`, `200/min` global, upload de document/version `30/min` et recherche `60/min` (`120/min` admin) — P5 (Redis en prod).
- Headers Talisman (CSP, HSTS si `FORCE_HTTPS`), `ProxyFix` si `BEHIND_PROXY`.
- Soft delete des utilisateurs (désactivation), interdiction de s'auto-supprimer.
- CORS restreint à `FRONTEND_URL` + `localhost:3000/5173`, `MAX_CONTENT_LENGTH` 50 Mo, extensions autorisées configurées.

## 7. Flux principaux

1. **Connexion** : `LoginForm` → `POST /api/auth/login` (rate-limité) → code 2FA email → `TwoFactorAuth` → `POST /api/auth/verify-2fa` → cookies de session posés (`_set_session_cookies`) → `useAuth` recharge `GET /api/auth/me` → redirect `/dashboard`.
2. **Gestion utilisateurs** : `pages/user-management` → hooks `features/users/useUsers.js` → `features/users/api.js` → client `lib/api.js` → `GET/POST/PUT/DELETE /api/users` → pagination + filtres serveur.
3. **Auth guard** : `features/auth/components/ProtectedRoute.jsx` s'appuie sur `useAuth()` (query `GET /api/auth/me`, source de vérité = cookie), loader pendant le statut `loading`, redirection `/login` sinon. `RoleGuard` (restriction par rôle) existe mais **n'est monté nulle part** dans `Routes.jsx`.
4. **Rétention (P5)** : service compose `scheduler` → `flask retention run` quotidien → préavis `retention_warning` J-30 (dédupliqué) → archivage à l'échéance → purge après `retention_purge_after_days` (fichiers stockage supprimés, droits nettoyés, `AuditLog.document_id` détaché) → `RetentionReport` persisté ; exécution manuelle et rapports via `/api/admin/retention/*`.

## 8. Points d'attention d'architecture

- **Désalignement frontend/backend** : le backend est livré jusqu'à P5 (documents, permissions, recherche, dashboard, notifications, rétention + audit consultable) mais les écrans document-library / document-upload / advanced-search consomment toujours des données mockées — seuls `login` et `user-management` sont entièrement branchés sur l'API.
- **Couche data hétérogène** : `features/auth` et `features/users` passent par TanStack Query + Zustand, tandis que les pages restantes utilisent des `useState`/`useEffect` avec données en dur.
- **Config secrète** : fallback de `SECRET_KEY` en dur dans `config.py` (refusé en production par `create_app`) ; `backend/.env` et `frontend/.env` présents sur le disque mais ignorés par `.gitignore` (dépôt sans aucun fichier tracké à ce jour).
- **`instance/uniarchive.db`** (SQLite de dev) et `simple_test.py` coexistent avec le parcours PostgreSQL/Docker.
- **Pipeline CI présent (P0.7)** : `backend/.github/workflows/ci.yml` — 4 jobs bloquants (ruff `E9`+`F`,
  pyright 0 erreur, pytest sur **SQLite + `postgres:16` + `redis:7`**, `docker build` puis démarrage réel
  avec `/health` + enveloppe d'erreur vérifiées). Tests = **300 cas pytest** (`backend/tests/`, 20 fichiers,
  harness `conftest.py`) ; l'ancien trio de scripts manuels `requests` a été
  réécrit en pytest (P0.3). Voir [03_etat_avancement.md](03_etat_avancement.md).
- **`backend/app/routes.py`** (blueprint `main` jamais enregistré) et `backend/app/common/`
  (erreurs/réponses/transactionnel) **ont été supprimés en P0.1** : l'enveloppe d'erreur vit dans
  `app/errors.py`, les réponses/pagination dans `app/serializers.py`.
