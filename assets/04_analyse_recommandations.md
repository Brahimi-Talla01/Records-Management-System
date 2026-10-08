# UniArchive - Analyse critique & recommandations

> Document d'audit n°4/4 — voir aussi : [01_presentation_projet.md](01_presentation_projet.md) · [02_architecture_technique.md](02_architecture_technique.md) · [03_etat_avancement.md](03_etat_avancement.md)

---

## 1. Ce qui est bien conçu et à conserver

1. **Le modèle de données documentaire** (`backend/app/models/`) : couverture quasi complète des besoins archivistiques — dossiers arborescents (`Folder` auto-référencé), types avec durées de conservation (`DocType.default_retention_days`), niveaux de confidentialité, versioning (`DocumentVersion` avec checksum), tags, et **4 tables de droits granulaires** (utilisateur/rôle × dossier/document). C'est un vrai socle produit, pas un modèle de démo.
2. **L'authentification** : choix solides — bcrypt (12 rounds), 2FA par email avec expiration et limite de tentatives, reset password par token à usage unique, messages d'erreur génériques (anti-énumération), audit systématique des événements de connexion.
3. **La structure du backend** : factory `create_app()`, blueprints par domaine, séparation routes/services/modèles — l'architecture cible est la bonne, c'est son remplissage qui manque.
4. **Le design system frontend** : composants UI centralisés (`components/ui/`), pages décomposées en composants, cohérence Tailwind. Les 6 écrans constituent une base de démonstration commerciale immédiatement utilisable (démo « clickable »).
5. **`init_db.py`** : script de seed propre (rôles, types de documents, dossiers, admin) qui facilite l'installation.

## 2. Ce qui pose problème ou risque de bloquer la mise en production

### 🔴 Bloquants sécurité

| #   | Problème                                                                                                                                     | Localisation                                     | Impact                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| S1  | `SECRET_KEY` a un **fallback en dur** (`'dev-secret-key...'`) — `JWT_SECRET_KEY` n'existe plus (plus de JWT)                                 | `config.py`                                      | Bloqué en prod (`create_app` refuse) mais risqué si la garde saute |
| S2  | ~~`backend/.env` versionné dans git~~ → ✅ **corrigé** : `.env` ignoré par `.gitignore`, `.env.example` fourni                               | `backend/.env`, `backend/.gitignore`             | Résolu (mais rotation toujours à faire si ancien commit)           |
| S3  | Mots de passe temporaires **en clair dans l'email + réponse API** (`temporary_password`)                                                     | `app/users/services.py`, `app/users/routes.py`   | Interception du mot de passe                                       |
| S4  | ~~Tokens JWT en `localStorage`~~ → ✅ **corrigé** : session opaque en cookie HTTPOnly, révocation serveur                                    | `lib/api.js`, `app/auth/routes.py`               | Résolu                                                             |
| S5  | ~~Pas de rate limiting~~ → ✅ **corrigé** : Flask-Limiter (login 5/min, 2FA 10/min, reset 5/min, global 200/min)                             | `app/auth/routes.py`, `extensions.py`            | Résolu (stockage mémoire si pas de Redis)                          |
| S6  | ~~Pas de headers de sécurité~~ → ✅ **corrigé** : Talisman (CSP, nosniff, frame-deny) ; HTTPS **non forcé** par défaut (`FORCE_HTTPS=false`) | `app/__init__.py`, `config.py`                   | Partiel : MITM si déployé en HTTP publique                         |
| S7  | URL API : `VITE_API_URL` (défaut `/api` en Docker, fallback `http://localhost:5000/api` en dev)                                              | `frontend/src/lib/api.js`, `frontend/Dockerfile` | Résolu pour la prod Docker ; fallback encore en dur en dev         |

### 🔴 Bugs identifiés — ✅ TOUS CORRIGÉS (voir note ci-dessous)

| #   | Bug                                                                                                                                                                                                                                                                                  | Localisation                                   | État                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| B1  | Route 2FA mal déclarée : `/security-alerts/int:alert_id/resolve` — le `< >` manquant rend la route invalide                                                                                                                                                                          | `app/auth/routes.py`                           | ✅ Corrigé (`<int:alert_id>`)                                                                                   |
| B2  | Mauvaise clé de token : `localStorage.getItem("access_token")` ≠ `auth-token` stocké → header `Bearer null`                                                                                                                                                                          | ~~`userService.js`~~ (fichier supprimé)        | ✅ Obsolète : plus de token, cookie de session                                                                  |
| B3  | Le token axios est lu **une seule fois au chargement du module**, jamais rafraîchi                                                                                                                                                                                                   | ~~`userService.js`~~ (fichier supprimé)        | ✅ Obsolète : `lib/api.js` + intercepteurs CSRF/401                                                             |
| B4  | Blueprints `documents`, `dashboard`, `search` jamais enregistrés dans `create_app()`                                                                                                                                                                                                 | `app/__init__.py`                              | ✅ Corrigé (enregistrés avec prefix)                                                                            |
| B5  | `AuditLog` : `auth_service._log_failed_attempt` écrit dans une colonne `metadata` inexistante (le modèle définit `details`) → crash probable sur tentative de login échouée                                                                                                          | ~~`auth_service.py`~~ → `app/auth/services.py` | ✅ Corrigé (`details` JSON)                                                                                     |
| B6  | Le dashboard attribue un **rôle aléatoire** à l'utilisateur connecté (données de démo laissées en place)                                                                                                                                                                             | `dashboard/index.jsx`                          | ✅ Corrigé (`GET /api/auth/me` + mapping des rôles)                                                             |
| B7  | _(découvert en corrigeant)_ `app/users/routes.py` (stub tracké) masquait le dossier `app/users/routes/` contenant la vraie API users → l'API utilisateurs était inopérante                                                                                                           | `app/users/`                                   | ✅ Corrigé (fusion : `routes.py` + `services.py` + `repositories.py`, 204 lignes actives)                       |
| B8  | _(découvert par la vérification de types)_ `or_` utilisé **sans import** dans `get_all_users` → toute recherche filtrée (`GET /api/users?search=…`) plantait en `NameError` → 500                                                                                                    | `app/users/services.py`                        | ✅ Corrigé (`from sqlalchemy import or_`) — testé en réel                                                       |
| B9  | Rate limiting **silencieusement en mémoire** : `Limiter(storage_uri="memory://")` primait sur `RATELIMIT_STORAGE_URI` (Redis), et `limiter.storage_uri = …` dans `create_app()` n'était jamais lu → limites par worker, perdues au redémarrage (les docs annonçaient pourtant Redis) | `extensions.py`, `app/__init__.py`             | ✅ Corrigé (`storage_uri=None` → la config décide) — vérifié : `RedisStorage` + clés `LIMITS:LIMITER/*` en db 1 |
| B10 | L'écran 2FA **n'était jamais affiché** : aucun `setCurrentStep('2fa')` + redirection immédiate sur `/dashboard` alors que la session n'existe pas encore → retour sur `/login` + 401 sur `/auth/me`                                                                                  | `frontend/src/pages/login/index.jsx`           | ✅ Corrigé (étape 2FA sur `requires_2fa`, redirection après `verify-2fa`) — parcours testé de bout en bout      |

**Note — correctifs appliqués (validation : `create_app()` OK, 31 routes mappées, **pyright 0 erreur**, lint + build frontend OK, parcours login → 2FA → dashboard → liste/export utilisateurs testé contre le stack Docker) :**

- Sécurité config : refus explicite au démarrage en production si `SECRET_KEY`/`DATABASE_URL` manquants (`app/__init__.py`) ; `.env` jamais tracké ; création de `backend/.env.example`, `frontend/.env.example` et `.env.example` racine.
- URL d'API externalisée : `VITE_API_URL` lue dans `frontend/src/lib/api.js` (plus d'URL en dur côté app ; injection `ARG VITE_API_URL=/api` au build Docker).
- Migration JWT → session opaque HTTPOnly + CSRF double-submit (voir [05_plan_restructuration_scalable_auth_session.md](05_plan_restructuration_scalable_auth_session.md)).
- `test_email.py` (adresse email personnelle en dur) supprimé ; identifiants de test retirés de la page de login et de la sortie console de `init_db.py`.

### 🟠 Risques de maintenabilité / évolutivité

- ~~**Deux clients HTTP**~~ → ✅ **unifié** : un seul client axios `frontend/src/lib/api.js` (interceptors CSRF + redirection 401), consommé via `features/*/api.js`.
- ~~**Duplication de la logique d'audit**~~ → ✅ **Fait (P0.8)** : tout passe par `app/services/audit_service.py` (`log()` + filet `after_request` sur les mutations) ; `AuditLog.log_action` et les appels divergents ont été supprimés.
- **Divergence de nomenclature des rôles** : seed = `Admin/Prof/Etudiant/Secretaire` (`init_db.py`), frontend = `admin/teacher/student/staff` via un mapping local dupliqué (`mapBackendRole` copié dans `dashboard/index.jsx` **et** `user-management/index.jsx`).
- **`RoleGuard` jamais branché** : `frontend/src/Routes.jsx` ne protège que par la session — n'importe quel utilisateur ouvre `/user-management` (l'API, elle, vérifie `@admin_required` sur les mutations).
- **`lazy='dynamic'`** sur plusieurs relations : déprécié avec SQLAlchemy 2.x, à migrer.
- **Emails envoyés via threads bruts** (`app/services/email_service.py`) : pas de retry, pas de file d'attente ; en production, prévoir Celery/RQ ou un service transactionnel.
- **`datetime.utcnow`** partout (28 occurrences) : déprécié en Python 3.12+, à remplacer par `datetime.now(timezone.utc)`.
- ~~**Aucun test automatisé**~~ → ✅ **Fait (P0.2/P0.3)** : **100 tests pytest** dans `backend/tests/` (harness `conftest.py`, suite verte sur SQLite **et** PostgreSQL 16), couverture `app/` ≈ 72 %. Côté frontend, `@testing-library/*` reste déclaré sans test ni runner ❌.
- ~~**Pas de CI**~~ → ✅ **Fait (P0.7)** : `backend/.github/workflows/ci.yml` (ruff + pyright + pytest sur SQLite/PostgreSQL/Redis + `docker build` et démarrage réel). Le déploiement reste manuel (pas de staging) — voir [06_dockerisation.md](06_dockerisation.md).
- ~~**`app/common/` sous-utilisé**~~ → ✅ **Supprimé (P0.1)** : l'enveloppe d'erreur vit dans `app/errors.py`, les réponses/pagination dans `app/serializers.py`, et toutes les routes passent par `ok()`/`paginated()`.

## 3. Ce qui doit être revu ou refactorisé avant de continuer

1. ~~**Unifier la couche HTTP frontend**~~ ✅ **Fait** : un seul client `frontend/src/lib/api.js`, URL lue depuis `import.meta.env.VITE_API_URL`.
2. ~~**Brancher l'écran user-management sur l'API réelle**~~ ✅ **Fait** (hooks TanStack Query dans `features/users/`).
3. ~~**Corriger B1 à B10**~~ ✅ **Fait** (tableau ci-dessus).
4. **Harmoniser les rôles** : choisir une nomenclature canonique (ex. slugs `admin`, `teacher`, `student`, `staff` + libellés FR) et la partager via `GET /api/users/roles` — supprimer les `mapBackendRole` dupliqués.
5. ~~**Sécuriser la configuration**~~ ✅ **Fait** (refus en prod, `.env.example`) — reste à **brancher `RoleGuard`** sur les routes admin.
6. **Rendre le 2FA configurable** (par utilisateur ou par rôle) plutôt qu'obligatoire pour tous : sans SMTP opérationnel, le produit est inutilisable ; et le 2FA par email à chaque connexion sera rejeté par les utilisateurs — prévoir TOTP (app authenticator) comme alternative.

## 4. Recommandations prioritaires (ordre conseillé)

### Phase 0 — Assainir ✅ **largement effectuée**

1. ~~Corriger les bugs B1-B10.~~ ✅
2. ~~Sécuriser secrets/env (S1, S2, S7).~~ ✅ (reste S3 : mots de passe temporaires en clair)
3. ~~Unifier la couche HTTP + brancher user-management sur l'API.~~ ✅
4. ~~**Partiellement fait**~~ ✅ **Fait** : Docker backend/frontend ✅ ; **pytest (100 tests) + CI (4 jobs)** ✅ (P0.2/P0.3/P0.7) — voir [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §13.

### Phase 1 — Cœur métier documents (≈ 3-5 semaines) : _c'est là que le produit devient réel_

1. **API documents** : `POST /api/documents/upload` (multipart, stockage local puis S3-compatible), `GET /api/documents` (filtres/pagination), `GET /download`, versioning, tags, corbeille.
2. **Service de permissions** : implémenter `app/services/permission_service.py` en s'appuyant sur les 4 tables de droits existantes, avec héritage dossier → sous-dossiers.
3. **Raccorder document-library et document-upload** à l'API réelle (et remplacer les users hardcodés par `useAuth()`).
4. Recherche : `POST /api/search` (SQLAlchemy full-text ou PostgreSQL `tsvector` sur `title`/`description`/`ocr_text`), historisation dans `SearchHistory`.
5. Dashboard : `GET /api/dashboard/stats` (compteurs documents/utilisateurs/poids stocké, récentes activités depuis `AuditLog`).

### Phase 2 — Conformité & administration (≈ 2-3 semaines)

1. Écran de consultation de l'audit trail (filtres + export CSV/PDF) — argument de vente majeur « conformité/traçabilité ».
2. Administration des rôles et des droits par dossier (UI pilotant `RoleFolderRight`/`UserFolderRight`).
3. OCR réel (ex. Tesseract via service worker/queue) pour remplir `ocr_text` et alimenter la recherche.
4. Notifications in-app (`Notification` + polling ou SSE) et expiration automatique selon `retention_period` (job planifié).

### Phase 3 — Mise en production (≈ 2 semaines)

1. ~~Rate limiting (Flask-Limiter)~~ ✅ · ~~headers de sécurité (Talisman)~~ ✅ · ~~révocation serveur au logout~~ ✅ (sessions) · ~~**pytest + CI**~~ ✅ (P0.2/P0.7) · mots de passe temporaires à usage unique (obliger le changement à la première connexion au lieu de l'envoyer en clair) ❌.
2. Hébergement : backend sur un PaaS avec PostgreSQL managé, assets frontend sur CDN, HTTPS partout (`FORCE_HTTPS=true` + `SESSION_COOKIE_SECURE=true`), sauvegardes chiffrées + politique de rétention documentée (RGPD).

## 5. Évolutions « vendabilité » (produit commercial)

- **Multi-établissements (multi-tenant)** : ajouter `Institution` au sommet du modèle, scoper toutes les tables par `institution_id`, sous-domaines par client (`ecole.uniarchive.com`), branding configurable par client (logo, couleurs) — c'est **le** prérequis pour vendre à plusieurs écoles avec un seul déploiement.
- **Plans tarifaires** : dimensionnement par volumétrie (Go stockés), nombre d'utilisateurs actifs, modules activés (OCR, scanner, audit avancé). Un free tier « établissement pilote » facilite l'entrée.
- **Onboarding guidé** : assistant de création (rôles → départements/filières → arborescence de dossiers → import CSV des comptes), templates de configuration par type d'établissement (université / IPES / centre de formation).
- **Modules différenciants pour le marché des écoles privées et centres de formation** :
  - **Gestion des soutenances** : dépôt des mémoires/thèses, workflow de validation encadrant → jury → archivage, plagiariat check (intégration).
  - **Espace diplômés** : portail de demande d'attestations/duplicates de diplômes avec paiement en ligne — forte demande dans les IPES, monétisable.
  - **Signature électronique** des documents administratifs (intégration type Yousign/Docusign).
  - **Filières & promotions** : entités dédiées + génération automatique d'arborescence par rentrée (`2025-2026/Informatique/L3`).
  - **Conformité locale** : reporting pour les autorités de tutelle (accréditations, dépôts légaux de thèses).
  - **API publique + webhooks** : intégration avec les SIE/scolarités existantes (une API documentée est aussi un argument de vente B2B).
  - **Mobile/PWA** : consultation et photo-scan de documents depuis un téléphone (utile pour les centres de formation sans scanner).
- **Chiffrement** : chiffrer les fichiers au repos pour les niveaux `confidential`/`restricted` (le champ `is_encrypted` existe déjà) et afficher cet argument dans le discours commercial.

## 6. Par où commencer — résumé en 5 actions

1. ~~**Corriger les 10 bugs** (B1-B10) et retirer les secrets du dépôt.~~ ✅ **Fait.**
2. ~~**Brancher user-management** sur l'API existante.~~ ✅ **Fait** (chaîne CRUD + filtres + import/export validée).
3. **Construire l'API documents + permissions** (phase 1) : sans cela, le produit n'a pas de cœur.
4. ~~**Installer pytest + CI** (Docker déjà en place)~~ ✅ **Fait** (100 tests, CI 4 jobs — P0.2/P0.3/P0.7) : la qualité est figée avant d'accélérer.
5. **Décider l'architecture multi-tenant** dès maintenant (ajout d'`institution_id` dans le schéma) — c'est 10× moins cher à faire avant d'avoir des données clients.

> Bonus rapide : **brancher `RoleGuard`** dans `frontend/src/Routes.jsx` sur `/user-management` et `/dashboard` (le composant existe, il n'est simplement jamais utilisé).
