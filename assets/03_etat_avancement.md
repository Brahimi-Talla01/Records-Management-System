# UniArchive — État d'avancement

> Document d'audit n°3/4 — voir aussi : [01_presentation_projet.md](01_presentation_projet.md) · [02_architecture_technique.md](02_architecture_technique.md) · [04_analyse_recommandations.md](04_analyse_recommandations.md)

Légende : ✅ implémenté · 🟡 partiel / en cours · ❌ manquant

---

## 1. Vue synthétique par domaine

| Domaine                                               | Frontend                                          | Backend                                        | Global |
| ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- | ------ |
| Authentification (login + 2FA + reset)                | ✅ session + compte (profil, mdp, 2FA, appareils, alertes) | ✅ sessions opaques + Redis (fallback mémoire) | ✅     |
| Gestion des utilisateurs                              | ✅ branché API (TanStack Query)                   | ✅                                             | ✅     |
| Documents (upload, stockage, bibliothèque)            | ✅ (bibliothèque, fiche et dépôt réels)           | ✅ (API P2 : CRUD, versions, download)         | ✅     |
| Recherche avancée                                     | ✅ branchée API (full-text, facettes, extrait, historique) | ✅ (API P4 : full-text, facettes, historique)  | ✅     |
| Tableau de bord                                       | ✅ branché API (summary/activity/expiring/uploads/recent) | ✅ (5 endpoints P4, adaptés au rôle)           | ✅     |
| Permissions par rôle/utilisateur                      | ✅ (gardes + écran d'accords document et `check` F6) | ✅ (moteur D6 + API P3)                        | ✅     |
| Notifications                                         | ✅ in-app (Header + page `/notifications`, compteur pollé) | 🟡 (in-app P4 : événements + API ; pas d'email)| 🟡     |
| Audit / traçabilité                                   | ✅ (écran journal filtré + export ; F6)           | ✅ (écriture intégrale + consultation/export API P5) | ✅     |
| Rétention documentaire (P5)                           | ✅ (écran super admin : statut, simulation, rapports ; F6) | ✅ (job CLI + scheduler compose + API super admin)| ✅     |
| Administration (rôles, types, dossiers, départements) | ✅ (référentiels en écriture + réglages + campus ; F6) | ✅ (CRUD admin livré P1/P6)                    | ✅     |
| **Multi-campus & configuration** (P1)                 | ✅ (campus, réglages, institution, bandeau de périmètre ; F6) | ✅ (institution, campus, réglages typés)       | ✅     |
| Déploiement / industrialisation                       | ✅ Docker Compose (+ scheduler rétention P5)      | ✅ Docker + gunicorn, CI (4 jobs), 300 tests pytest | ✅     |

## 2. Fonctionnalités implémentées (de bout en bout)

### 2.1 Connexion et sécurité (le seul flux complet)

- **Frontend** (`pages/login/`) : `LoginForm`, `TwoFactorAuth` (6 inputs, renvoi de code **réalisé en relançant le `login`** — le backend régénère et renvoie un nouveau code, limité par le rate limiting 5/min), `ForgotPassword`, `SecurityBadges`, `LanguageSelector`, `UniversityBranding`.
- **Backend** (`app/auth/routes.py` + `app/auth/services.py`) :
  - Login par username **ou** email, messages d'erreur génériques (bonne pratique anti-énumération).
  - **2FA obligatoire à chaque connexion** : code 6 chiffres, expiration 10 min, max 3 tentatives, envoi email asynchrone (`app/services/email_service.py`).
  - **Session opaque** : cookies `uniarchive_session` (HTTPOnly) + `uniarchive_csrf` (double-submit), TTL glissant 7 j, store Redis/mémoire — **plus de refresh token**.
  - `GET /me`, liste/révocation des sessions (`/sessions`), prolongation (`/session/extend`), changement de mot de passe avec vérification de l'ancien.
  - Reset password par token sécurisé (`secrets.token_urlsafe`, 1 h, usage unique).
  - Journalisation d'audit de tous les événements de connexion (`AuditLog`).
  - Détection force brute : ≥ 5 échecs / 15 min → `SecurityAlert` haute sévérité ; **rate limiting serveur** (`5/min` login, `10/min` verify-2fa, `5/min` reset).
  - Gestion du 2FA du compte (`/2fa/enable|confirm|disable`) côté API — **aucun écran frontend ne l'appelle encore**.
- **Caveat** : le 2FA par email nécessite un SMTP configuré ; sans SMTP, **personne ne peut se connecter** (le mode dev logge le code dans `docker compose logs backend` / la console — pas de désactivation possible).

### 2.2 Gestion des utilisateurs — backend complet

- CRUD paginé avec filtres (search ilike, rôle, département, statut) — `app/users/services.py` + `app/users/repositories.py`.
- Import CSV (validation ligne à ligne, rapport d'erreurs) et export CSV.
- Statistiques (total, actifs, par rôle, par département) — `GET /api/users/statistics`.
- Reset de mot de passe par l'admin + notification email (⚠️ le mot de passe temporaire est envoyé **en clair dans l'email** et retourné dans la réponse API : `temporary_password`).
- Soft delete + audit `user_created` / `user_updated` / `user_deleted`.

### 2.3 Gestion des utilisateurs — frontend branché sur l'API ✅

- `pages/user-management/` + `features/users/` (TanStack Query) : liste paginée, création, édition, désactivation, reset de mot de passe, import CSV, export CSV (`window.open` sur `/users/export`), rôles et départements réels.
- La nomenclature des rôles est **mappée côté client** (`mapBackendRole` : `Admin→admin`, `Prof→teacher`, `Etudiant→student`, `Secretaire→staff`).
- **Reste mocké** : le `ActivityPanel` (`mockActivities`, `mockSecurityAlerts`) et les actions groupées (endpoint dédié absent).
- `GET /api/users/statistics` est exposé mais **l'écran n'appelle pas** `useUserStatistics`.
- ✅ Depuis F0, l'écran est protégé côté route par `RequireRole roles={['Admin']}` (le `RoleGuard` mort est branché) : un non-admin est redirigé vers `/forbidden`.

### 2.4 Phase 0 du plan 07 — fondations backend ✅ (30/09/2026)

> Détail et commits : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §5 et §13.

- **Code mort supprimé** (P0.1) : `app/routes.py` (blueprint `main` jamais enregistré), `app/common/`,
  `app/auth/error_handlers.py`.
- **Contrat d'API** : enveloppe `{"error", "code", "details"}` sur toutes les réponses d'erreur
  (P0.4, `app/errors.py` — 404/405/401/403/400/413/415 testés) ; sérialiseurs `to_dict()` +
  pagination `{items, page, per_page, total, pages}` (P0.5, `app/serializers.py`). Les routes
  existantes ont gardé leur format (`GET /api/users` reste `{users, current_page, …}`).
- **Seeds CLI idempotents** (P0.6) : `flask seed roles|doctypes|departments|admin|demo` — remplace le
  bloc monolithique d'`init_db.py`, re-exécutable sans doublon.
- **Journal d'audit** (P0.8) : `audit_service.log()` sur toutes les mutations (POST/PUT/PATCH/DELETE)
  + filet `after_request` ; bug corrigé : `_log_failed_attempt` n'écrivait jamais `user_id`, donc
  l'alerte `multiple_login_attempts` ne pouvait jamais être créée.
- **Index & versionnement** (P0.9) : 24 index (`index=True` sur 11 modèles + 2 composites), migration
  `e5f0a1b2c3d4` idempotente, entrypoint `stamp` baseline puis `upgrade`, `EXPLAIN` →
  `Index Scan Backward using ix_document_created_at`.
- **Exploitation** (P0.10) : volume Docker `uploads_data` monté sur `/app/uploads`, `UPLOAD_FOLDER`
  pilotable par variable d'environnement.
- **Qualité** : harness pytest (**100 tests**, SQLite + PostgreSQL 16 + Redis 7), `ruff` (E9 + F),
  `pyright` 0 erreur, CI GitHub Actions 4 jobs, `docker build` + démarrage réels.

### 2.5 Phase 1 du plan 07 — institution, campus, réglages ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §7.1 et §13.2.

- **Multi-campus natif** (non multi-tenant) : modèles `Institution` (ligne unique), `Campus`,
  `Setting` ; `campus_id` ajouté sur `department` (NOT NULL, code unique **par campus**),
  `folder` (NULL = global), `user_account` (NULL = accès global) et `document` (NOT NULL,
  dénormalisé) ; `document.retention_expires_at`/`updated_at`/`deleted_by`.
- **Décision super admin** : un `Admin` **sans campus** est le super administrateur (gère campus,
  admins et réglages globaux) ; un `Admin` rattaché ne pilote que son campus. Nouveau décorateur
  `super_admin_required` ; `user.to_dict()` expose `campus_id`, `campus`, `is_super_admin`.
- **API** : `GET/PUT /api/institution`, CRUD `/api/campuses` (+ `PATCH /status` — **aucune
  suppression physique**, `409` si des données y sont rattachées, `403` inter-campus), et
  `/api/settings` (+ `/schema`, `/public`, `/defaults`).
- **Réglages hautement configurables** : registre typé (`app/settings/registry.py` : 6 catégories,
  ~25 clés) servant de contrat d'API et de validation ; résolution **défaut → global → campus**,
  cache Redis/mémoire invalidé à l'écriture.
- **Migration** `f1a2b3c4d5e6` idempotente (compatible `create_all`), backfill vers le campus
  `PRINCIPAL`, `upgrade`/`downgrade` vérifiés ; seeds idempotents (institution, campus, réglages).
- **Filtrage** : `app/scope.py` (`is_super_admin`, `apply_campus_scope`, `require_campus_access`)
  prêt à être branché sur les repositories documents/utilisateurs en P2/P3.
- **Qualité** : **+35 tests** P1 (129 passés au total), `ruff` 0 violation, `pyright` 0 erreur.

### 2.6 Phase 2 du plan 07 — documents, stockage, dossiers, référentiels ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §7.2 et §13.3.

- **Stockage** (`app/storage/`) : `StorageService` local (interface prête pour S3), chemin sûr
  (refus de `..`), checksum SHA‑256, volume Docker `uploads_data` réutilisé.
- **Upload** : validation extension + **magic bytes**, taille max 50 Mo (`413`), `422` explicites.
- **Documents** (`/api/documents`) : liste filtrée/paginée (q, dossier, département, type, statut,
  confidentialité, tags, dates, tri), détail, création (multipart ou JSON), `PATCH`, soft‑delete +
  restore, actions groupées (`bulk`), export CSV, tags.
- **Versions** : upload (v N+1), liste, **téléchargement streamé** (nom généré côté serveur, audit
  `document_downloaded`), restauration, `preview` inline (PDF/images).
- **Dossiers** (`/api/folders`) : liste/tree, fil d'Ariane, création, renommage, déplacement
  (anti‑cycle `409`), suppression refusée si non vide (`409`).
- **Référentiels** : `/api/departments`, `/api/doc-types`, `/api/tags`, `/api/roles` (CRUD,
  unicité, `409` si utilisé).
- **Permissions de base** : `PermissionService` (périmètre campus > rôle admin, confidentialité,
  droits explicites utilisateur/rôle) ; le moteur complet + API dédiée arrivent en P3.
- **Qualité** : **+46 tests** P2 (183 passés au total), `ruff` 0 violation, `pyright` 0 erreur.

### 2.7 Phase 3 du plan 07 — permissions ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §7.3 et §13.4.

- **Moteur** (`PermissionService`) conforme à la décision D6, première règle gagnante : périmètre
  campus → droit explicite utilisateur → héritage **dossier** (utilisateur puis rôle) → droit rôle
  sur le document → `Admin` (hors refus explicite) → confidentialité → refus.
- **`explain()`** renvoie `{allowed, rule}` (source de la décision, utile en débogage) et
  **`effective()`** liste les 4 actions ; **cache de résolution par requête** (`flask.g`).
- **Héritage dossier** borné (remontée anti‑cycle) : un droit sur un dossier parent s'applique aux
  sous‑dossiers et à leurs documents.
- **API** `/api/permissions` : droits effectifs, liste des accords, attribution/révocation
  (document et dossier × utilisateur/rôle), et `POST /check` pour l'administration.
- **Intégration** : décorateur centralisé `@require_permission(action, 'document')` sur les routes
  documents ; toute décision refusée écrit `permission_denied` (avec la règle), les octrois et
  révocations sont audités.
- **Qualité** : **+35 tests** P3 (218 passés au total), `ruff` 0 violation, `pyright` 0 erreur.

### 2.8 Phase 4 du plan 07 — recherche, dashboard, notifications ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §7.4 et §13.5.

- **Recherche full-text** (`/api/search`) : moteur PostgreSQL (`websearch_to_tsquery('french')` sur
  `document.search_vector` pondéré A=title/B=description/C=ocr_text, complété par `pg_trgm` sur le
  titre pour tolérer les fautes), tri par pertinence (`ts_rank`), extrait surligné (`ts_headline`),
  **facettes** (types, départements, statuts, confidentialités), `took_ms` ; fallback portable
  `ILIKE` + extrait découpé sur les autres dialectes (chemin couvert par les tests SQLite, chemin
  PostgreSQL exercé par la CI Docker).
- **Historique de recherche** (`/api/search/history`) : enregistré automatiquement à chaque requête
  non vide (dédupliqué si identique), liste paginée et vidage propres à l'utilisateur.
- **Dashboard** (`/api/dashboard/*`) : `summary` (totaux, par statut/département, stockage utilisé,
  échéances 30 j, compteurs personnels), `activity` (audit borné au périmètre — tout le campus pour
  un admin, ses propres actions pour un utilisateur), `expiring` (rétention proche/dépassée, flag
  `overdue`), `uploads` (dépôts par mois, zéro rempli), `recent-documents` ; super admin pouvant
  filtrer par `campus_id`, les autres rôles verrouillés sur leur campus (403 sinon).
- **Notifications in-app** (`/api/notifications`) : liste (`unread=1`), badge `unread-count`,
  marquage lu / tout lu, suppression (404 si non propriétaire) ; déclenchées par les événements
  « dépôt de document » (admins du campus + super admins, hors auteur) et « droit accordé »
  (document ou dossier, sauf auto-attribution et re-octroi).
- **Migration** `b4c5d6e7f8a9` : index composites `notification`/`search_history` (portables) +
  colonne `search_vector`, trigger, index GIN et extension `pg_trgm` (PostgreSQL uniquement) ;
  `upgrade`/`downgrade` vérifiés ; contrat d'index étendu dans `test_indexes.py`.
- **Harness** : chaque session de test dispose désormais de son propre client HTTP — plusieurs
  sessions authentifiées peuvent coexister dans un même test.
- **Qualité** : **+47 tests** P4 (265 passés au total), `ruff` 0 violation, `pyright` 0 erreur.

### 2.9 Phase 5 du plan 07 — rétention, audit consultable, durcissement ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §7.5 et §13.6.

- **Cycle de rétention** (`RetentionService.run`) : préavis `retention_warning` J-30 aux admins du
  campus (dédupliqué par utilisateur + document, désactivable par réglage campus), archivage
  automatique à l'échéance (`status='archived'`, audit `document_archived`), purge après
  `retention_purge_after_days` (fichiers supprimés du stockage, droits nettoyés,
  `AuditLog.document_id` détaché — historique conservé, audit `document_purged`). `dry_run=True`
  simule sans écrire ; le job est neutralisé si `archives.retention_enabled` est faux.
- **Pilotage** : `flask retention run [--dry-run] [--campus-id]` / `retention status` (CLI) +
  service compose `scheduler` (boucle quotidienne, intervalle `RETENTION_INTERVAL_SECONDS`) ;
  API super admin `/api/admin/retention/status|run|reports` (compteurs, exécution manuelle,
  historique des rapports paginé).
- **Rapports** : table `retention_report` (migration `c5d6e7f8a9b0` idempotente, index portables
  `ix_document_status_retention_expires_at` + `ix_retention_report_ran_at`, upgrade/downgrade
  vérifiés) ; réglages ajoutés au registre : `archives.retention_auto_archive`,
  `archives.retention_purge_after_days`.
- **Audit consultable** : `GET /api/audit` (paginé, filtres action/object_type/user_id/from/to,
  scoping D6 : super admin tout ou `campus_id`, admin de campus borné à son campus via les
  comptes et documents, 403 inter-campus) et `GET /api/audit/export` (CSV plafonné à 10 000
  lignes) ; le dashboard `activity` réutilise désormais `audit_service.list_entries`.
- **Durcissement** : rate limit upload de document/version `30/min`, recherche `60/min`
  (`120/min` admin) ; `GET /health/ready` (vérifie la base + Redis si configuré, 503 si dégradé —
  healthcheck Docker) et `GET /api/version` (`APP_VERSION`/`GIT_COMMIT`/`APP_BUILD_DATE`).
- **Qualité** : **+35 tests** P5 (300 passés / 7 ignorés au total ; couverture `app/` ≈ 82 %,
  services et routes rétention/audit 92-100 %), `ruff` 0 violation, `pyright` 0 erreur.
  Référence API : [08_api_reference.md](08_api_reference.md).

### 2.10 Phase 6 du plan 07 — OpenAPI, OCR, chiffrement au repos ✅ (01/10/2026)

> Détail : [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §13.7.

- **OpenAPI/Swagger** (merge `f44d6ed`) : `GET /api/openapi.json` généré depuis la carte des routes
  (params, corps, codes, binaire) avec marqueurs `__guards__` posés par les décorateurs
  d'authentification et de permission ; console `/api/docs` (Swagger UI) + tableau HTML hors ligne,
  CSP dédiée par vue Talisman.
- **OCR synchrone à l'upload** (merge `fec3354`) : remplissage de `document.ocr_text` derrière le
  réglage `features.ocr_enabled` (éteint par défaut), à l'upload comme à la restauration — PDF via
  leur couche texte (`pypdf`, `OCR_MAX_PDF_PAGES`), images via Tesseract (`OCR_LANGUAGES`,
  `OCR_TIMEOUT_SECONDS`, binaire ajouté à l'image Docker). Extraction best-effort (jamais bloquante)
  et recherche enrichie : fallback `ILIKE` sur `ocr_text` + extrait surligné.
- **Chiffrement au repos** (merge `cd23806`) : `app/storage/crypto.py`, format auto-décrit
  `UNIARCH\x01` puis blocs AES-GCM de 64 Ko (AAD = index du bloc → altération, troncature ou
  réordonnancement détectés). Activation `FILE_ENCRYPTION_KEY` (base64 de 32 octets) +
  `ENCRYPTED_LEVELS` (défaut `confidential,secret`) ; `checksum`, `size_bytes` et `is_encrypted`
  décrivent le clair, téléchargement/aperçu/OCR déchiffrent à la volée, clé mal formée = refus du
  démarrage, clé absente à la lecture = `500 encrypted_file_unreadable`.
- **Stockage objet S3/MinIO** (merge `e789928`) : `S3Storage` derrière `get_storage()`
  (`STORAGE_BACKEND=s3` + `S3_ENDPOINT_URL`/`S3_BUCKET`/`S3_ACCESS_KEY`/…, addressing « path » pour
  MinIO) — même interface que `LocalStorage`, donc chiffrement, OCR et purge suivent le backend
  choisi ; démarrage refusé si `S3_BUCKET` est vide.
- **Performance §7.5.4** (merge `47174d2`) : `flask perf explain [--json]` — `EXPLAIN ANALYZE`
  (PostgreSQL) / `EXPLAIN QUERY PLAN` (SQLite) sur les 10 requêtes suivies (listing, plein texte,
  facettes, échéances, filtre tag, audit, notifications), une défaillance n'arrêtant pas les autres ;
  **pagination clé** sur `GET /api/documents` (`?pagination=keyset` → `{items, per_page, has_more,
  next_cursor}` sans `COUNT(*)`, `&cursor=` enchaîne) — mode `offset` inchangé, curseur lié au tri
  (`400 cursor_invalid` si le tri change, `400 cursor_unsupported_sort` pour `size_bytes` nullable).
- **Qualité** : **+55 tests P6** (349 passés / 7 ignorés au total, 25 fichiers), `ruff` 0 violation,
  `pyright` 0 erreur, `docker build` de l'image vérifié (Tesseract et boto3 inclus).
- **P6 complète** : les 5 lots de §13.7 sont mergés `--no-ff` sur `master`.

### 2.11 Plan 07 **frontend** — F0 fondations ✅ et F1 session & compte ✅ (02/10/2026)

> Détail : [07_plan_frontend_multicampus.md](07_plan_frontend_multicampus.md) §6 et §13.1/§13.2.

**F0 — Fondations et qualité** (bloquant, livré le 02/10/2026) :

- **Design system unifié** : `src/styles/index.css` est la **source unique de tokens** ; primitives
  `Button`, `Input`, `Select`, `Checkbox`, `Badge`, `Card`, `Skeleton`, `EmptyState`, `Toast`,
  `ConfirmDialog` ; `AppIcon` en `currentColor` ; règle ESLint maison `local/no-raw-colors`
  (interdit palettes brutes, `bg-[#…]` et la prop JSX `color`).
- **Couche d'erreurs et de contrat** : `lib/errors.js` (`toAppError`, `messageFor`…),
  `lib/validate.js` (**zod en frontière partout**, décision Q2), `lib/formatters.js`,
  `lib/queryKeys.js`, `lib/api.js` (axios + cookies + CSRF) — **0 `alert()`/`confirm()` natifs**
  (remplacés par `useToast`/`useConfirm`).
- **Navigation** : `navigate()` partout, `document.title` par route, `Breadcrumb`, gardes
  `RequireAuth`/`RequireRole`/`RequireScope` + pages 403/404, routes **lazy** avec `ErrorBoundary`
  par route et `manualChunks` vendors.
- **Qualité** : **Vitest + RTL + MSW** (fixtures `renderWithProviders`), `tsconfig.json`
  (TS progressif), codegen `openapi-typescript` (`npm run codegen`), budget `size-limit`
  (**126,43 ko gzip** initial, vs 311 ko), CI GitHub Actions, README réel.
- **Preuves** : `npm run lint` → 0 · `npm test` → 23 verts · `tsc --noEmit` → 0 erreur ·
  `npm run build` vert · `npm run size` → 126,43 ko gzip.

**F1 — Session & compte** (livré le 02/10/2026) :

- **Mon compte** (`/account`) : profil en lecture (`GET /auth/me`), changement de mot de passe
  (`POST /auth/change-password`, règles client miroir de `validate_password_strength`), réglage
  2FA (`enable` → `confirm` → `disable`), liste des sessions (`GET /auth/sessions`) avec
  révocation unitaire et globale, alertes de sécurité (`GET /auth/security-alerts` + résolution).
- **Mes appareils** : sessions serveur réelles (IP, User-Agent résumé, dernière activité),
  révocation avec `ConfirmDialog`.
- **Lien de réinitialisation** : route publique `/reset-password?token=` →
  `POST /auth/reset-password`.
- **M10 corrigé** : le `temporary_password` renvoyé par `POST /users/<id>/reset-password` est
  affiché par toast (plus de message « email envoyé »).
- `ActivityPanel` (gestion utilisateurs) branché sur les **alertes de sécurité réelles** du compte
  (`mockSecurityAlerts` supprimé).
- **Preuves** : `npm run lint` → 0 · `npm test` → **39 verts** · `tsc --noEmit` → 0 erreur ·
  `npm run build` vert · `npm run size` → **127,59 ko gzip** initial.

**F2 — Tableau de bord & notifications** (livré le 03/10/2026) :

- Domaines `features/dashboard` et `features/notifications` (hooks TanStack Query + zod en
  frontière) ; `StatsOverview`, `RecentDocuments`, `RecentActivity`, `ExpiringDocuments` (J‑30,
  `overdue`) et `UploadsChart` (`recharts`, **chunk `charts` séparé**) branchés sur l'API.
- `SystemStatus` remplacé par `GET /health/ready` + `GET /api/version` (admin).
- Notifications in-app réelles : compteur **pollé 45 s**, panneau `Header`, `NotificationCenter`
  du tableau de bord et page `/notifications` (marquage lu / tout lu, suppression confirmée,
  pagination) ; `mock*` M1/M9 supprimés.
- **Preuves** : `lint` → 0 · `npm test` → **53 verts** · `tsc --noEmit` → 0 erreur · `build` vert ·
  `size` → **150,32 kB** initial + **58,51 kB** chunk graphes.

**F3 — Bibliothèque & structure** (livré le 04/10/2026) :

- Domaines `features/documents`, `features/folders` et `features/referentials` (hooks TanStack
  Query + zod en frontière) : listing (offset **et** `keyset`), détail + versions, restauration de
  version, téléchargement, aperçu, export CSV, bulk, étiquettes, dossiers (arbre/chemin/CRUD/move),
  droits effectifs (`/permissions/document/<id>`) et référentiels (types/tags/départements).
- **Bibliothèque** : la vue est **pilotée par l'URL** (filtres, tri serveur, pagination
  offset ↔ clé, dossier courant) — une URL copiée rouvre la même vue, le retour navigateur
  conserve les filtres. Navigation par dossiers (fil d'Ariane serveur, création/édition/suppression
  avec traduction des `409` `folder_not_empty`/`folder_cycle`), tableau à sélection multiple,
  **actions groupées** (`move/delete/restore/confidentiality`) et **export CSV** filté.
- **Fiche document** `/document-library/:documentId` : métadonnées, statut/confidentialité,
  **boutons activés par les droits réels** servis par l'API, historique des versions
  (téléchargement / restauration), étiquettes (ajout/retrait si `edit`), aperçu (Blob).
- `lib/download.js` (nom de fichier sûr depuis `Content-Disposition`, `URL.revokeObjectURL`
  différée) ; aperçu `URL.createObjectURL` révoquée au démontage.
- **Preuves** : `npm run lint` → 0 · `npm test` → **80 verts** · `tsc --noEmit` → 0 erreur ·
  `npm run build` vert · `npm run size` → **150,95 kB** initial + **58,62 kB** chunk graphes.

**F4 — Dépôt & versions** (livré le 04/10/2026) :

- Nouveau domaine `features/settings` (`GET /settings/public`, repli) ; `features/documents` étendu
  (`create` multipart → v1, `addVersion` → N+1) avec `onUploadProgress` (XHR) et `AbortController`.
- `document-upload/` **réel** : file d'attente (concurrence 2), refus avant envoi (extension/taille),
  progression réelle, annulation, nouvelle tentative, titre modifiable, **statut OCR** ; limites lues
  dans les réglages publics (plus de `50 * 1024 * 1024` en dur).
- Métadonnées par API (types, départements, dossiers) ; niveau `confidential|secret` = **chiffrement
  au repos signalé** à l'utilisateur.
- Action « Nouvelle version » sur la fiche document (`POST /documents/<id>/versions`).
- Scanner : état **« non disponible »** honnête (piloté par `features.scanner_enabled`), plus de
  simulation ; onglet « Traitement par lot » redondant supprimé.
- **Preuves** : `npm run lint` → 0 · `npm test` → **93 verts** · `tsc --noEmit` → 0 erreur ·
  `npm run build` vert · `npm run size` → **151,18 kB** initial + **58,62 kB** chunk graphes.

**F5 — Recherche avancée** (livré le 04/10/2026) :

- Nouveau domaine `features/search` (`GET /search`, `/search/history` GET/DELETE) et
  `lib/sanitize` pour rendre les extraits `<mark>` en éléments React (jamais `innerHTML`).
- Écran piloté par l'URL (URL copiée = même recherche), **débounce 300 ms** de la frappe,
  indicateurs `took_ms`/`engine`, pagination serveur et **facettes cliquables** issues de l'API.
- **Historique** : liste dédupliquée, réutilisation en un clic, vidage confirmé ; `429` affiché en
  « recherche en pause ».
- **Preuves** : `npm run lint` → 0 · `npm test` → **107 verts** · `tsc --noEmit` → 0 erreur ·
  `npm run build` vert · `npm run size` → **151,37 kB** initial + **58,62 kB** chunk graphes.

**F6 — Administration multi-campus** (livré le 04/10/2026) :

- **Domaines** : `features/campuses` (CRUD + bascule de statut + institution + store de
  périmètre Zustand), `features/settings` (schéma typé, valeurs par campus, défauts, `PUT` en lot),
  `features/referentials` (CRUD admin départements/types/tags/rôles), `features/audit`
  (liste filtrée + export CSV), `features/retention` (statut, exécution, rapports),
  `features/permissions` (accords document + `check`), `features/users` étendu (filtres serveur,
  statistiques, rapport d'import) — tous validés par zod en frontière (Q2).
- **Écrans** : `Campus` (création, édition, activation ; suppression **toujours refusée** 409
  affiché — Q4), `Réglages` (éditeur piloté par `GET /settings/schema` + onglet Institution),
  `Référentiels` (4 onglets, conflits 409 traduits), `Utilisateurs` (**pagination et filtres
  serveur pilotés par l'URL**, formulaire complet — matricule, username, rôle, campus (Q2), mot de
  passe —, soft delete confirmé, `temporary_password` affiché, statistiques réelles, import CSV
  avec rapport d'erreurs, export filtré, **actions groupées masquées** R6‑02), `Permissions`
  (accords document utilisateur/rôle, révocation, outil `POST /permissions/check`), `Audit`
  (filtres URL + export), `Rétention` (statut, **simulation dry run par défaut**, exécution réelle
  doublement confirmée, rapports).
- **Espace Administration regroupé (Q9)** : menu « Administration » du `Header` (desktop + mobile)
  derrière les gardes `RequireRole`/`RequireScope` ; entrées super admin (Campus, Rétention)
  conditionnelles ; bandeau de périmètre (A4) sur Réglages/Référentiels/Audit.
- **`ActivityPanel`** branché sur le journal réel (`GET /dashboard/activity`) — plus de données
  factices ; « Voir tout » ouvre l'écran d'audit.
- **Preuves** : `npm run lint` → 0 · `npm test` → **137 verts** (28 fichiers) · `tsc --noEmit` →
  0 erreur · `npm run build` vert · `npm run size` → **152,5 kB** initial + **58,62 kB** chunk
  graphes.
- **Versionnage** : branche `f6-administration` fusionnée **`--no-ff`** dans la branche de base
  **`test`** le 05/10/2026 (merge commit `291417d`) ; le merge intègre F3→F6 (historique de phases
  linéaire, aucune autre fusion `--no-ff` n'avait été faite). Aucun push effectué.

**Reste à faire frontend** : F7 durcissement (optionnel : i18n complète, a11y, e2e Playwright
étendu, virtualisation des grandes listes).

**F7 — Durcissement, partiel (a11y + e2e)** (livré le 05/10/2026) :

- **Accessibilité (F7.2)** : `vitest-axe` en tests unitaires (décision : plutôt que
  `@axe-core/react`) — 8 tests a11y sur les primitives (Button, Input erreur reliée, Select
  fermé/ouvert, Modal, navigation clavier Select, focus trap + restauration Modal, SkipLink) ;
  Modal réécrite (focus trap, Échap, restauration du focus), Select en `listbox`/`option`
  naviguable au clavier, Input `aria-invalid`/`aria-describedby` + erreur `role=alert`, menus
  Header `aria-haspopup`/`aria-expanded` + Échap, SkipLink branché et `id="main-content"` sur les
  13 pages, tableaux `caption`/`scope`/`aria-sort`, focus-visible global par tokens (aucune
  couleur en dur).
- **E2E Playwright (F7.3)** : campagne sur la **stack docker réelle** — sessions admin/prof
  persistées par le globalSetup (code 2FA lu en base, pas de SMTP en dev), Chrome système via
  `channel` (téléchargement des navigateurs Playwright inabordable ici) ; **11 tests verts** :
  login + 2FA complet, parcours Administration (utilisateurs, référentiels, audit, campus,
  rétention), 403 (redirection **et** `GET /api/users` refusé pour un prof), 413 (limite Nginx),
  429 (rate-limit login).
- **Correctif latent découvert par l'e2e** : le `manualChunks` de Vite séparait react du reste du
  vendor et Rollup hébergeait les helpers d'interop CJS dans l'autre chunk → cycle
  d'initialisation inter-chunks (crash prod « forwardRef », page blanche — invisible en jsdom) ;
  vendor fusionné, graphe d'imports re-vérifié acyclique.
- **Preuves** : `npm run lint` → 0 · `npx vitest run --maxWorkers=2` → **145 verts** (29 fichiers,
  dont 8 a11y) · `tsc --noEmit` → 0 erreur · `npm run build` vert · `npm run size` → **151,6 kB**
  initial + **58,4 kB** chunk graphes · `npx playwright test` → **11 verts** (29,6 s) sur
  `docker compose up --build` (seed démo : admin, prof/secretaire/etudiant).
- **Versionnage** : branche `f7-durcissement` (`0560d59` a11y, `3bf8299` e2e + fix bundle)
  fusionnée **`--no-ff`** dans **`test`** le 05/10/2026 (merge commit `dfbc488`). Aucun push
  effectué.

**Reste à faire frontend** : F7 partiellement livré — i18n (F7.1), virtualisation des grandes
listes (F7.4) et journal d'erreurs front (F7.5) non faits.

**Bootstrap admin par environnement + données de démonstration** (livré le 05/10/2026, backend
`master` merge `a20fcdb`) :

- **Super admin 12-factor** : identifiants lus dans l'environnement (`ADMIN_USERNAME`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`, `ADMIN_MATRICULE`), compte créé au
  démarrage du conteneur s'il n'existe pas (idempotent), validation des règles API (mot de passe
  ≥ 8 + majuscule/minuscule/chiffre, email) et **garde production** : en `FLASK_ENV=production`
  sans `ADMIN_PASSWORD`, le démarrage est refusé (plus de mot de passe par défaut implicite).
- **Jeu de démonstration** (`app/demo_data.py`, `flask seed demo-data`, `SEED_DEMO_DATA=true`) :
  6 documents réalistes avec de **vrais fichiers PDF** générés (via le service de stockage actif,
  avec version, checksum, étiquettes, `ocr_text` et rétention) — idempotent par titre, refusé en
  production (`--force` pour contourner), installé au démarrage seulement si la base ne contient
  **aucun document réel**.
- **Correctif découvert par la validation docker** : `crypto.readable` servait le handle fichier
  ouvert (non chiffré) — le worker gunicorn le fermait au teardown, **après** l'envoi → corps de
  réponse vide sur les téléchargements. Corrigé (contenu servi depuis la mémoire, handle fermé par
  `readable`, test de régression).
- **Preuves** : 387 tests pytest verts (dont 12 nouveaux bootstrap/démo + régression crypto),
  `ruff` 0, `pyright` 0 ; validation réelle sur stack docker jetable : base vierge → seed de
  base + admin depuis le `.env` (`superadmin`/`Bootstrap@2026` testé) → 2FA → `/api/me` →
  `/api/documents` (6 démo) → téléchargement d'un PDF (689 octets, `%PDF-1.4`) → redémarrage :
  0 recréation (idempotent).

**Corrections d'usage frontend** (livré le 06/10/2026, branche `test`, non poussé) :

- **Perte de focus dans les formulaires (corrigé)** : le piège de focus de `Modal` dépendait de
  l'identité de `onClose`, une fonction inline reconstruite à chaque rendu du parent. Sur les
  modales dont l'état du formulaire vit chez le parent (`référentiels`, `campus`), chaque frappe
  rejouait l'effet et le focus sautait sur le bouton de fermeture. `onClose` est désormais lu via
  une ref : l'effet ne dépend que de `isOpen` (tests de régression : modale, select « searchable »,
  filtres pilotés par l'URL).
- **Bascule grille / lignes** : nouveau composant `DocumentGrid` (cartes) à côté de
  `DocumentTable`, même sélection multiple et mêmes actions ; le tri passe par un sélecteur dédié.
  Le mode vit dans l'URL (`?view=grid`), jamais transmis à l'API.
- **Bouton « Administration » (navbar)** : sur une page admin, la variante pleine (`bg-primary`)
  recevait `text-foreground` par-dessus `text-primary-foreground` — texte sombre sur fond bleu. La
  couleur suit désormais l'état actif (blanc), comme les entrées de navigation, uniquement via des
  tokens.
- **Modèle CSV d'import** : bouton « Modèle CSV » téléchargeable (en-tête exact attendu par
  `UserService.import_users_from_csv` + ligne d'exemple, identifiants de rôle/département réels)
  pour préparer le fichier avant import.
- **Aide & Support** : les trois entrées inertes du tableau de bord ouvrent une ressource réelle —
  guide de démarrage rapide, coordonnées de support de l'établissement (`GET /institution`, lien
  `mailto`) et tutoriels renvoyant vers l'écran concerné. Le même contenu est aussi exposé par une
  page **`/help`** (« Centre d'aide »), atteignable depuis la navigation de toutes les pages
  (entrée « Aide »), via une source unique (`lib/help`). La page embarque un **champ de recherche**
  local qui filtre le guide et les tutoriels (insensible aux accents).
- **Preuves** : `npm run lint` → 0 · `npx vitest run --maxWorkers=2` → **166 verts** (34 fichiers) ·
  `tsc --noEmit` → 0 erreur · `npm run build` vert · `npm run size` → **151,5 kB** initial +
  **58,4 kB** chunk graphes.

## 3. Fonctionnalités partielles / en cours

### 3.1 Documents — bibliothèque, fiche et dépôt branchés ✅ (F3/F4)

- **Modèles DB prêts** : `Document`, `DocumentVersion`, `DocType`, `Tag`, `document_tag`, droits par document. Champs conformité présents (rétention, confidentialité, `ocr_text`).
- **API livrée en P2** (voir §2.6) : upload, listing filtré, téléchargement, versioning, tags, bulk, export — **le backend n'est plus le goulot** ; bibliothèque et fiche branchées en **F3**, reste le dépôt (**F4**).
- **Stockage** : local livré en P2 (`app/storage/`, volume Docker `uploads_data`), **S3/MinIO livré
  en P6** (§2.10) — même interface, activation par `STORAGE_BACKEND=s3`.
- **Frontend — bibliothèque & fiche branchées ✅ (F3, 04/10/2026)** : `document-library/` et
  `document-detail/` consomment l'API réelle (listing filté URL-piloté, dossiers, versions,
  étiquettes, droits, corbeille/bulk/export, aperçu, téléchargement) ; plus de `mockDocuments` /
  `mockFolders`, l'utilisateur vient de `useAuth()`.
- **Frontend — dépôt réel ✅ (F4, 04/10/2026)** : `document-upload/` dépose en multipart
  (`POST /documents` → v1, `POST /documents/<id>/versions` → N+1) avec progression XHR, annulation
  (`AbortController`), nouvelle tentative, limites lues dans `GET /settings/public`, statut OCR et
  mise en garde chiffrement ; le scanner est un état « non disponible » (plus de simulation).
- **Services de permissions** : `permission_service.py` contient 3 méthodes vides (`pass`) — aucun contrôle d'accès document/niveau n'est appliqué.

### 3.2 Recherche avancée — branchée ✅ (F5, 04/10/2026)

- **Backend livré en P4** (voir §2.8) : `/api/search` (full-text PostgreSQL + fallback, facettes,
  extrait surligné, `took_ms`) et `/api/search/history` (enregistrement automatique dédupliqué).
- **Écran branché** : `advanced-search/` (`SearchForm`, `SearchFilters`, `SearchResults`,
  `SearchHistory`) consomme l'API réelle ; vue pilotée par l'URL, facettes cliquables, extraits
  `<mark>` rendus par `lib/sanitize`, historique réutilisable, `429` en « pause ». Plus de
  `generateMockResults` ni d'utilisateur hardcodé.
- **Recherches sauvegardées** : `SavedSearches` **retiré** — l'endpoint `GET/POST/DELETE
  /api/search/saved` (**R6‑01**, prévu P7 backend) n'existe pas encore (décision Q6 : endpoint
  backend, pas de `localStorage`).

### 3.3 Tableau de bord et notifications — branchés ✅ (F2, 03/10/2026)

- **Backend livré en P4** : `/api/dashboard/summary|activity|expiring|uploads|recent-documents`,
  agrégats bornés au campus et adaptés au rôle ; notifications in-app `/api/notifications`.
- **Écran branché** : `StatsOverview` (cartes par rôle : `super_admin`/`campus_admin`/`user`),
  `RecentDocuments`, `RecentActivity` (journal d'audit traduit), `ExpiringDocuments` (préavis J‑30)
  et `UploadsChart` (`recharts`, chunk `charts` séparé) ; `SystemStatus` remplacé par
  `GET /health/ready` + `GET /api/version`. Chargement (`Skeleton`) et jeux vides (`EmptyState`)
  gérés — **plus aucun chiffre ni table factice**.
- **Notifications** : compteur pollé (45 s), panneau `Header`, `NotificationCenter` et page
  `/notifications` (marquage lu / tout lu, suppression confirmée, pagination).
- ✅ `handleLogout` du dashboard appelle `POST /api/auth/logout` puis redirige (plus de simple
  redirection sans révocation de session).

### 3.4 Audit & alertes de sécurité

- Écriture : les actions sensibles (login, création/modif/suppression utilisateur) sont bien journalisées dans `AuditLog`.
- Consultation : **backend livré en P5** + **frontend branché en F6** — écran `/audit` (filtres
  `action/object_type/user_id/from/to` pilotés par l'URL, `campus_id` pour un super admin,
  pagination, export CSV) ; le `ActivityPanel` de la gestion des comptes lit désormais
  `GET /dashboard/activity` (plus de données mock).
- ✅ La route `PUT /api/auth/security-alerts/<int:alert_id>/resolve` est correctement déclarée (bug corrigé) et listée/résolue côté API.

## 4. Fonctionnalités manquantes (par rapport à la vision commerciale)

### Produit

- ❌ **Multi-établissements (multi-tenant)** : aucune notion d'établissement/institution dans le modèle. Aujourd'hui 1 base = 1 école.
- ❌ Configuration par structure pédagogique : filières, niveaux, promotions, années académiques (seuls `Department` et `Folder` existent).
- ❌ Facturation / abonnements / plans tarifaires.
- ❌ Onboarding : assistant de première configuration, templates de rôles/dossiers par type d'établissement.
- ❌ Branding white-label par client (l'université est codée en dur dans `UniversityBranding.jsx`).

### Fonctionnel

- ✅ API documents complète (upload réel, download, versions, corbeille, tags, métadonnées) — écrans branchés en F3 (bibliothèque/fiche) et F4 (dépôt).
- 🟡 OCR réel : **backend livré en P6** (§2.10) — `ocr_text` rempli à l'upload (PDF `pypdf` +
  Tesseract) derrière le réglage `features.ocr_enabled` ; restent le raccordement de l'UI d'upload
  et l'activation du réglage.
- 🟡 Chiffrement au repos : **backend livré en P6** (§2.10) — niveaux `confidential`/`secret`
  scellés en AES-GCM quand `FILE_ENCRYPTION_KEY` est posée ; variable à renseigner au déploiement.
- ❌ Numérisation scanner réelle : aucun endpoint backend — `ScannerIntegration` affiche désormais un état « non disponible » (plus de simulation trompeuse).
- ❌ Emails transactionnels métier (les notifications **in-app** sont livrées en P4 — dépôt de document, droit accordé, préavis de rétention P5 ; modèles `Notification`/`SearchHistory` désormais exploités).
- ✅ Gestion des rôles/droits par UI (F6) : CRUD référentiels (rôles, types, tags, départements),
  accords document par utilisateur/rôle + révocation, outil `check` ; les **accords dossier**
  disposent de l'API et des hooks côté front mais aucun endpoint de lecture
  (`GET /permissions/folder/<id>/grants` absent — ligne backend candidate R6‑04) : ils ne sont
  donc pas encore listables dans un écran.
- 🟡 Consultation de l'audit trail : **API + export CSV livrés en P5** (§2.9), écran conformité
  branché en F6.
- ❌ i18n réelle : le sélecteur de langue de la page de login mémorise un choix… mais aucune traduction n'existe (F7 livré partiellement le 05/10/2026 : a11y + e2e — **i18n toujours non faite**, à trancher FR seul vs FR/EN).
- ✅ Expiration automatique selon `retention_period` : **cycle complet livré en P5** (préavis → archivage → purge, §2.9), corbeille/restauration couvertes par le soft-delete P2, écran de rétention branché en F6 (statut, simulation, exécution confirmée, rapports).

### Technique / exploitation

- ✅ **Tests automatisés backend** (P0.2/P0.3) : **349 cas pytest** dans `backend/tests/` (25 fichiers,
  harness `conftest.py` : app factory, isolation par test, fixtures de session admin), couverture
  `app/` ≈ **82 %** ; les 3 anciens scripts manuels `requests` ont été réécrits en pytest et les
  références JWT ont disparu.  ✅ côté frontend (F0) : **Vitest + RTL + MSW** opérationnels —
  **137 tests** verts au sortir de F6, **145 verts** au sortir de F7 (dont 8 a11y vitest-axe),
plus `typecheck`, `build` et `size-limit` en CI — auxquels s'ajoutent depuis F7 **11 tests e2e
Playwright** sur la stack docker réelle (login 2FA, parcours admin, 403/413/429).
- ✅ **CI** (P0.7) : `backend/.github/workflows/ci.yml` — `ruff` (E9 + F), `pyright` (0 erreur),
  `pytest` sur **SQLite + `postgres:16` + `redis:7`**, puis `docker build` + démarrage réel de
  l'image (`/health` = 200, enveloppe d'erreur vérifiée). ❌ **environnement de staging** — mais ✅
  **Docker/Compose** : `docker-compose.yml` (PostgreSQL 16 + Redis 7 + backend gunicorn + frontend Nginx), `backend/Dockerfile` + `docker-entrypoint.sh`, `frontend/Dockerfile` multi-stage + `nginx.conf` (voir [06_dockerisation.md](06_dockerisation.md)).
- 🟡 Documentation API : **référence manuelle livrée en P5** ([08_api_reference.md](08_api_reference.md)) · **OpenAPI/Swagger livré en P6** (`GET /api/openapi.json` + console `/api/docs`, générés depuis les routes) ; documentation utilisateur restante.
- 🟠 Gestion des secrets : `.env` **ignoré par `.gitignore`** (aucun fichier n'est tracké dans le dépôt), `.env.example` des deux côtés + à la racine ; fallback `SECRET_KEY` en dur toujours présent mais **refusé au démarrage en production**.
- ✅ Rate limiting serveur (Flask-Limiter, Redis en prod), ✅ headers de sécurité (Talisman : CSP, nosniff…), ✅ `FORCE_HTTPS`/`BEHIND_PROXY` optionnels — la révocation se fait côté serveur (plus de token à blocklister).

## 5. Écrans frontend vs API (matrice de raccordement)

| Écran (`frontend/src/pages/`) | Données actuelles                                                 | API à raccorder                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `login/`                      | API réelle ✅ (compte admin garanti par le bootstrap `ADMIN_*` au démarrage) | Ajouter : renvoi dédié de code 2FA (aujourd'hui relance du `login`), écran de choix du nouveau mot de passe après reset |
| `user-management/`            | **API réelle ✅** (pagination/filtres serveur URL, création complète campus+mdp, soft delete, reset, stats, import/export) | Actions groupées en attente de `POST /api/users/bulk` (R6‑02, P7) — **masquées**   |
| `dashboard/`                  | **API réelle ✅** (`summary/activity/expiring/uploads/recent-documents`) | —                                                                                                                       |
| `notifications/`              | **API réelle ✅** (compteur pollé, marquage, suppression)          | —                                                                                                                       |
| `document-library/`           | **API réelle ✅** (listing URL-piloté, dossiers, corbeille, bulk, export, aperçu) | —                                                                                                                       |
| `document-detail/`            | **API réelle ✅** (détail, versions, étiquettes, droits effectifs)  | `tags` absents de `document.to_dict()` côté backend (ligne candidate R6‑03) — UI tolérante en attendant                  |
| `document-upload/`            | **API réelle ✅** (multipart `POST /documents`, progression, annulation, OCR, limites publiques) | —                                                                                                                       |
| `advanced-search/`            | **API réelle ✅** (recherche URL-pilotée, facettes, extrait surligné, historique) | Recherches sauvegardées : en attente de `GET/POST/DELETE /api/search/saved` (R6‑01, P7)                                   |
| `campuses/`                   | **API réelle ✅** (CRUD + bascule de statut, 409 traduits, stats)  | —                                                                                                                       |
| `settings/`                   | **API réelle ✅** (éditeur piloté par `/settings/schema`, valeurs campus, défauts, institution) | —                                                                                                                       |
| `referentials/`               | **API réelle ✅** (départements/types/tags/rôles en écriture, 409 traduits) | —                                                                                                                       |
| `permissions/`                | **API réelle ✅** (accords document utilisateur/rôle, révocation, `check`) | Accords dossier : lecture manquante côté backend (ligne candidate R6‑04)                                                 |
| `audit/`                      | **API réelle ✅** (filtres URL, pagination, export CSV)            | —                                                                                                                       |
| `retention/`                  | **API réelle ✅** (statut, simulation dry run, exécution confirmée, rapports) | —                                                                                                                       |
