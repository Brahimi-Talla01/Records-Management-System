# 07 — Plan de correction et de complétion du backend

> **Objet** : rendre le backend **100 % fonctionnel** (API documents, recherche, tableau de bord,
> permissions, configuration), avec un modèle **non multi-tenant** mais **multi-campus** au sein
> d'une institution, et un **niveau élevé de configurabilité**.
>
> **Statut** : ✅ **VALIDÉ le 30/09/2026** (décisions §11) — implémenté phase par phase.
> **Avancement** : **P0 → P5 ✅** (30/09 → 01/10/2026, merges `--no-ff` sur `master`) · **P6 en cours**
> (optionnelle : OCR / chiffrement / S3 / OpenAPI) — détail §13.
> **Versionnage** : dépôt `backend/` — base `master` (`4ee5a79`) + une branche par phase
> (`p0-fondations`, `p1-campus-config`, …), merge `--no-ff` à la fin de chaque phase ; ce document
> vit dans le dépôt racine (branche `main`). Un commit par étape importante, plan mis à jour
> (cases cochées) à chaque phase livrée.
> **Périmètre** : **backend uniquement** (le frontend n'est pas concerné, sauf si un contrat d'API
> l'exige — chaque évolution non rétro-compatible serait signalée en 🚨).

---

## 0. Ce que ce plan ne fait pas

| Exclu du périmètre                                             | Raison                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Multi-tenant (tenant_id, base/sous-domaines par établissement) | Décision explicite de l'utilisateur : **non voulu** (voir D1)                |
| Refonte du frontend (pages encore sur données mock)            | Préparation d'un contrat d'API stable, branchement UI en phase ultérieure    |
| OCR, chiffrement au repos, stockage S3                         | Découplés en **option** (P5/P6), jamais bloquants pour « 100 % fonctionnel » |
| Migration JWT → sessions                                       | ✅ Déjà fait (cf. `05_…md`)                                                  |

---

## 1. Position de départ (constat vérifié sur le code)

### 1.1 Ce qui existe et fonctionne ✅

| Bloc                      | Détail                                                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth session opaque**   | `uniarchive_session` (HTTPOnly) + `uniarchive_csrf` (double-submit), TTL, rotation, list/revoke des sessions, `BEHIND_PROXY`/Talisman/CORS                                                            |
| **2FA**                   | TOTP, codes à usage unique, tentative limitée, enable/confirm/disable, alertes de sécurité + résolution                                                                                               |
| **Mots de passe**         | change/forgot/reset (jetons)                                                                                                                                                                          |
| **API users (11 routes)** | liste filtrée/paginée, détail, create/update/delete (admin), reset-password, import CSV, export CSV, statistiques, `GET /roles`, `GET /departments`                                                   |
| **Modèle de données**     | 19 modèles / 19 tables, migration Alembic `23042faea7a9_create_all_tables` (complète : documents, versions, tags, 4 tables de droits, notifications, audit, historique de recherche, alertes)         |
| **Infra**                 | Docker 4 services (Postgres 16, Redis 7, Gunicorn 2 workers, Nginx), rate limiting en **Redis db1** (vérifié), seeds (`init_db.py` : rôles, types, départements, admin `admin/Admin@2024`), `/health` |
| **Qualité outillée**      | `pyright` **0 erreur** (`pyrightconfig.json`), `compileall` OK, build frontend OK, parcours login→2FA→dashboard→users testé en réel                                                                   |

**31 routes effectives** : 16 auth + 11 users + 3 stubs + `/health`.

### 1.2 Ce qui manque ou est faux ❌

| #   | Constat                                                                                                                                                                                             | Preuve                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| M1  | **3 modules sont des coquilles vides** (« Documents module OK »)                                                                                                                                    | `app/documents/routes.py`, `app/dashboard/routes.py`, `app/search/routes.py` |
| M2  | **`PermissionService` : 3 méthodes `pass`** → aucune règle de droits appliquée nulle part                                                                                                           | `app/services/permission_service.py`                                         |
| M3  | **Aucun upload/téléversement de fichier** : `UPLOAD_FOLDER`, `MAX_CONTENT_LENGTH`, `ALLOWED_EXTENSIONS` sont déclarés… et jamais utilisés ; aucun `request.files`, aucun dossier `backend/uploads/` | `config.py:51-54`                                                            |
| M4  | **Aucune API CRUD** : dossiers (folders), types de documents, tags, rôles, départements (seulement `GET`)                                                                                           | `app/**/routes.py`                                                           |
| M5  | **Pas d'API** notifications, d'audit (lecture), d'historique de recherche, de rétention/expiration                                                                                                  | idem                                                                         |
| M6  | **Zéro pytest** : 3 scripts manuels (`print`), dont `test_auth.py` encore **JWT** (obsolète)                                                                                                        | `backend/tests/`                                                             |
| M7  | **Pas de CI** (aucun `.github/`)                                                                                                                                                                    | constat                                                                      |
| M8  | **`app/routes.py` (`main_bp`) mort** : déclaré, jamais enregistré dans `create_app()`                                                                                                               | `app/routes.py` vs `app/__init__.py`                                         |
| M9  | **Colonnes modélisées mais non exploitées** : `document.ocr_text`, `is_encrypted`, `retention_period` (aucun calcul d'échéance, aucun job)                                                          | `app/models/document.py`                                                     |
| M10 | **Frontend sur données mock** : `document-library`, `document-upload`, `advanced-search`, `dashboard` n'appellent aucune API                                                                        | `frontend/src/pages/*`                                                       |
| M11 | **Pas d'indexes métier** sur les colonnes de filtrage/tri, pas de contrainte d'unicité par campus (le `unique` de `department.code` est global)                                                     | migration unique                                                             |

### 1.3 Dette identifiée (corrigeable proprement)

- Enveloppe de réponse incohérente : `{"users":[…], "total"…}` vs `{"error":…}` sans code.
- Environnement de test inexistant → chaque correction manuelle (comme celle faite récemment pour `or_`).
- `init_db.py` fait seeds + création d'admin en un seul bloc, pas idempotent par commande ciblée.
- Pas de journal d'audit sur les mutations API (seul `auth_service._log_audit` écrit de l'audit).
- `Department ↔ Folder` : relation 1‑1 à clarifier (`department.folder_id` + `backref`).

---

## 2. Décisions d'architecture proposées (à valider ⭐)

### D1 — Non multi‑tenant, **multi‑campus natif** ⭐

> **Une instance = une institution.** Le multi‑campus est un concept **métier interne** (site physique),
> pas une isolation de données. Aucun `tenant_id`, aucune base/schéma par établissement.

```text
Institution (1, profile unique)          ← ligne unique « institution »
 └── Campus (n)                          ← site(s) : principal, annexe, antenne…
      └── Département (n)                ← campus_id NOT NULL
           └── Dossier (n) / Document    ← hérite du campus
```

_Multi‑établissement plus tard ?_ Prévoir **une couche d'isolation** (prefiltre SQLAlchemy sur
`campus_id`) permettrait d'ajouter un découpage par établissement sans refonte — mais rien n'est
construit là-dessus aujourd'hui. C'est un bonus, pas un engagement.

### D2 — Rattachements et filtrage

| Entité        | Rattachement                           | Règle                                                          |
| ------------- | -------------------------------------- | -------------------------------------------------------------- |
| `Institution` | —                                      | ligne unique                                                   |
| `Campus`      | —                                      | CRUD admin, `is_active`                                        |
| `Department`  | `campus_id` **NOT NULL**               | code unique **par campus** : `UNIQUE(campus_id, code)`         |
| `Folder`      | `campus_id` nullable                   | `NULL` = dossier global/partagé, sinon campus                  |
| `Document`    | `campus_id` **NOT NULL** (dénormalisé) | figé à la création (folder → département → campus de l'auteur) |
| `UserAccount` | `campus_id` **nullable**               | `NULL` = accès **tous campus** (admin) ; sinon campus rattaché |

**Filtrage** : le contexte de requête calcule `current_campus_id` = `user.campus_id` ; un admin peut
forcer `?campus_id=` sur la liste des campus. Les filtres sont appliqués **au niveau repository**
(pas dans les routes) pour qu'aucun oubli ne puisse exposer des données d'un autre campus.

### D3 — Référentiels **globaux**, structure **par campus**

- **Globaux** (partagés) : `role`, `doc_type`, `tag`, niveaux de confidentialité, réglages généraux.
- **Par campus** : `department`, `folder`, `document`, `user` (par défaut).

> Alternative (référentiels par campus) : plus flexible, mais multiplie les données et complique le
> reporting global. **Recommandation : globaux**, sauf si vous en avez besoin — voir §11.

### D4 — Système de configuration « hautement configurable »

Trois blocs complémentaires :

1. **`institution`** (ligne unique) : nom, sigle, slogan, adresse, site web, logo, langue, fuseau.
2. **`campus`** : sites (CRUD complet + activation/désactivation + statistiques).
3. **`setting`** (clé/valeur JSON, **registre typé**) :
   - **Registre en code** (`app/settings/registry.py`) : chaque réglage déclare `key, type, défaut,
validation, catégorie, portée (global|campus), libellé, aide` → le schema sert **de contrat
     d'API et de documentation**.
   - Valeur effective = **défaut du registre → réglage global → réglage campus** (hiérarchie).
   - Cache Redis + invalidation à l'écriture.
   - Catégories prévues : `général`, `archives` (rétention par défaut, confidentialités autorisées,
     numérotation des matricules/cotes), `auth` (2FA imposé par rôle, durée de session, politique de
     mots de passe), `stockage` (chemin, taille max, extensions), `notifications` (email on/off),
     `feature` (flags d'activation : OCR, export massif…).

### D5 — Stockage des fichiers

`StorageService` (interface : `save, open, delete, exists, url`) avec implémentation
**locale sur volume Docker** aujourd'hui, **S3/MinIO** ajoutable sans toucher aux routes.
Chemin : `uploads/<campus_code>/<AAAA>/<MM>/<document_id>/v<N>_<uuid>.<ext>` (pas de nom de fichier
issu de l'utilisateur → pas de traversal, pas de collision). Volume dédié à ajouter dans
`docker-compose.yml` (**sinon les archives sont perdues à chaque rebuild** — cf. risque R3).

### D6 — Modèle de permissions

Ordre d'évaluation (première règle gagne) :

1. **Admin** → tout autorisé (sauf actions explicitement interdites).
2. **Déni explicite** sur `user_document_right` / `folder` → refus.
3. **Autorisation explicite** document (`can_view/can_edit/can_download/can_delete`).
4. **Héritage dossier** (`user_folder_right`, `role_folder_right`) → descend l'arborescence.
5. **Rôle** sur le document (`role_document_right`).
6. **Confidentialité** : `public` (tous), `internal` (authentifié), `confidential` (rattaché au
   département), `secret` (admin + explicite).
7. **Périmètre campus** : tout document d'un autre campus que `current_campus_id` → refus
   (sauf `campus_id NULL` sur l'utilisateur).

Toute décision est **tracée** dans `audit_log` (`permission_denied` inclus, utile en investigation).

### D7 — Jobs périodiques

Commande CLI `flask retention:run [--dry-run] [--days N]` + service `scheduler` dans
`docker-compose.yml` (boucle simple, **pas de Celery**). Elle :

- calcule `retention_expires_at = created_at + retention_period` (défaut = type de document),
- notifie avant expiration (J‑30), archive puis supprime physiquement selon la politique,
- génère un rapport d'exécution consultable via l'API.

### D8 — Rétro‑compatibilité

- Les réponses existantes **ne sont pas modifiées** (`{users:[…]}` reste tel quel) → le frontend
  cassé ne l'est pas encore plus.
- Nouveaux endpoints : enveloppe `{items:[…], page, per_page, total, pages}`.
- Erreurs : `{"error": "message", "code": "SNAKE_CASE", "details": {…}}` (`error` conservé).

---

## 3. Modèle de données

### 3.1 Nouvelles tables

```sql
CREATE TABLE institution (
  institution_id  SMALLSERIAL PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  short_name      VARCHAR(50),
  slogan          VARCHAR(300),
  address         VARCHAR(500),
  website         VARCHAR(200),
  email           VARCHAR(120),
  phone           VARCHAR(50),
  logo_url        VARCHAR(500),
  locale          VARCHAR(10)  NOT NULL DEFAULT 'fr',
  timezone        VARCHAR(60)  NOT NULL DEFAULT 'Africa/Douala',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campus (
  campus_id   SERIAL PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,   -- slug court, ex. DOUALA-C1
  name        VARCHAR(150) NOT NULL,
  address     VARCHAR(500),
  city        VARCHAR(120),
  phone       VARCHAR(50),
  email       VARCHAR(120),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE setting (
  key         VARCHAR(120) NOT NULL,
  scope       VARCHAR(20)  NOT NULL DEFAULT 'global' CHECK (scope IN ('global','campus')),
  campus_id   INTEGER      REFERENCES campus(campus_id) ON DELETE CASCADE,
  value       JSONB        NOT NULL,
  updated_by  INTEGER      REFERENCES user_account(user_id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (key, scope, campus_id)
);
```

### 3.2 Évolutions des tables existantes

| Table              | Changement                                                                                                                                                                                                                                | Notes                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `department`       | `+ campus_id INT NOT NULL FK`, **drop** `UNIQUE(code)`, **add** `UNIQUE(campus_id, code)`                                                                                                                                                 | backfill → campus par défaut  |
| `folder`           | `+ campus_id INT NULL FK`                                                                                                                                                                                                                 | héritage parent à la création |
| `user_account`     | `+ campus_id INT NULL FK`                                                                                                                                                                                                                 | `NULL` = tous campus          |
| `document`         | `+ campus_id INT NOT NULL FK`, `+ retention_expires_at TIMESTAMPTZ NULL`, `+ updated_at`, `+ deleted_by`                                                                                                                                  | backfill depuis `department`  |
| `document`         | **index GIN** sur `search_vector` (trigger : `setweight(… title,'A') \|\| setweight(… description,'B') \|\| setweight(… ocr_text,'C')`) + index `(campus_id, status, created_at DESC)`, `(department_id)`, `(doc_type_id)`, `(folder_id)` | recherche                     |
| `document_version` | index `(document_id, version_number)`                                                                                                                                                                                                     |                               |
| `audit_log`        | index `(created_at DESC)`, `(user_id)`, `(action)`                                                                                                                                                                                        | lecture/export                |
| `notification`     | index `(user_id, is_read, created_at DESC)`                                                                                                                                                                                               |                               |
| **toutes les FK**  | vérifier `ON DELETE` (aujourd'hui `SET NULL`/`CASCADE` hétérogènes)                                                                                                                                                                       | au cas par cas                |

**Migration Alembic unique** (revision suivante de `23042faea7a9`) :
`op.create_table(campus, institution, setting)` + colonnes + **backfill** :
`INSERT INTO campus (code,name) VALUES ('PRINCIPAL','Campus principal')` si vide, puis
`UPDATE … SET campus_id = <id>` sur department/folder/user/document, puis contraintes.

> ⚠️ La migration est **ajoutée, jamais modifiée** (règle Alembic immuable, rollback testé avec
> `flask db downgrade`).

---

## 4. Surface API complète (contrat à implémenter)

> Préalables communs : `@session_required` partout, validation d'entrée (schémas), journal d'audit
> sur toute mutation, pagination uniforme, cas d'erreur explicites (401/403/404/409/422).

### 4.1 Institution, campus, réglages (P1) — ✅ **implémenté**

| Méthode        | Route                    | Accès                | Description                                                                                                    |
| -------------- | ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET            | `/api/institution`       | public               | profil institution                                                                                             |
| PUT            | `/api/institution`       | admin                | mise à jour                                                                                                    |
| GET            | `/api/campuses`          | auth                 | liste (`?active_only=1`)                                                                                       |
| POST           | `/api/campuses`          | admin                | création                                                                                                       |
| GET/PUT/DELETE | `/api/campuses/<id>`     | admin (suppr. admin) | détail / maj / suppression (**409** si des documents/départements y sont rattachés → plutôt `is_active=false`) |
| GET            | `/api/settings`          | admin                | valeurs effectives (hiérarchie résolue) + schema                                                               |
| GET            | `/api/settings/schema`   | admin                | registre typé (types, défauts, validité, aide)                                                                 |
| GET            | `/api/settings/public`   | public               | réglages publics (logo, langue, extensions, taille max…)                                                       |
| PUT            | `/api/settings`          | admin                | batch `{key, value, campus_id?}` validé + purge cache                                                          |
| GET            | `/api/settings/defaults` | admin                | valeurs d'usine (reset)                                                                                        |

### 4.2 Structure : dossiers, départements, types, tags (P2) — ✅ **implémenté**

| Méthode               | Route                                                                    | Accès                             |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------- |
| GET                   | `/api/folders?campus_id&department_id&parent_id` (ou `view=tree`)        | auth                              |
| GET                   | `/api/folders/<id>/path` (fil d'Ariane)                                  | auth                              |
| POST                  | `/api/folders`                                                           | admin/Secrétaire                  |
| PATCH/DELETE          | `/api/folders/<id>` (DELETE = politique sur enfants/documents à définir) | admin                             |
| POST                  | `/api/folders/<id>/move`                                                 | admin                             |
| GET/POST              | `/api/departments`                                                       | liste : auth · création : admin   |
| GET/PATCH/DELETE      | `/api/departments/<id>`                                                  | admin                             |
| GET/POST/PATCH/DELETE | `/api/doc-types[/<id>]`                                                  | lecture : auth · écriture : admin |
| GET/POST/DELETE       | `/api/tags[/<id>]`                                                       | lecture : auth · écriture : admin |
| GET/POST/PUT/DELETE   | `/api/roles[/<id>]` (avec matrice de droits)                             | admin                             |

> `/api/users/roles` et `/api/users/departments` sont **conservés** (utilisés par le frontend) et
> deviennent des alias documentés.

### 4.3 Documents, versions, téléchargement (P2) — ✅ **implémenté**

| Méthode     | Route                                         | Description                                                                                                                                |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET         | `/api/documents`                              | filtres : `q, folder_id, department_id, campus_id, doc_type_id, status, confidentiality, tag_ids[], created_from/to, sort, page, per_page` |
| GET         | `/api/documents/<id>`                         | détail + versions + tags + résumé des droits                                                                                               |
| POST        | `/api/documents`                              | création métadonnées (optionnellement `multipart` avec fichier → v1 immédiatement)                                                         |
| PATCH       | `/api/documents/<id>`                         | mise à jour (journalisé)                                                                                                                   |
| DELETE      | `/api/documents/<id>`                         | **soft delete** (`status='deleted'`)                                                                                                       |
| POST        | `/api/documents/<id>/restore`                 | restauration                                                                                                                               |
| POST        | `/api/documents/bulk`                         | actions groupées `move / delete / restore / confidentiality` (l'UI a une sélection multiple)                                               |
| POST        | `/api/documents/<id>/versions`                | **upload** (`multipart`, contrôles : taille, extension, **magic bytes**, checksum SHA‑256, version `N+1`)                                  |
| GET         | `/api/documents/<id>/versions`                | historique                                                                                                                                 |
| GET         | `/api/documents/<id>/versions/<vid>/download` | **téléchargement streamé** (via `StorageService`, headers `Content-Disposition` sûrs, audit `download`)                                    |
| POST        | `/api/documents/<id>/versions/<vid>/restore`  | replier une version                                                                                                                        |
| GET         | `/api/documents/<id>/preview`                 | inline pour PDF/images (optionnel)                                                                                                         |
| POST/DELETE | `/api/documents/<id>/tags`                    | étiquetage                                                                                                                                 |
| GET         | `/api/documents/export`                       | CSV (aligné sur `/api/users/export`)                                                                                                       |

### 4.4 Permissions (P3) — ✅ **implémenté**

| Méthode    | Route                                                       | Description                                                             |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| GET        | `/api/permissions/document/<id>`                            | droits effectifs de l'utilisateur courant + détail (source de la règle) |
| GET        | `/api/permissions/document/<id>/grants`                     | liste des accords (admin/owner)                                         |
| PUT        | `/api/permissions/document/<id>/user/<uid>`                 | accorder `can_view/download/edit/delete`                                |
| DELETE     | `/api/permissions/document/<id>/user/<uid>`                 | révoquer                                                                |
| PUT        | `/api/permissions/document/<id>/role/<role_id>`             | accord au rôle                                                          |
| PUT/DELETE | `/api/permissions/folder/<id>/{user/<uid>\|role/<role_id>}` | droits héritables                                                       |
| POST       | `/api/permissions/check`                                    | `{subject, object, action}` → `{allowed, reason}` (débogage admin)      |

### 4.5 Recherche (P4) — ✅ **implémenté**

| Méthode | Route                                                                     | Description                                                                                                                 |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/search?q=&department_id&doc_type_id&tag_ids&date_from&date_to&page` | Postgres `websearch_to_tsquery` (fr) + `pg_trgm`, **facettes**, extrait surligné, `took_ms` ; fallback `ILIKE` si pas de PG |
| GET     | `/api/search/history`                                                     | historique de l'utilisateur (`search_history`)                                                                              |
| DELETE  | `/api/search/history`                                                     | vider son historique                                                                                                        |
| GET     | `/api/search/suggestions?q=`                                              | complétion sur titres/types (optionnel)                                                                                     |

### 4.6 Tableau de bord (P4) — ✅ **implémenté**

| Méthode | Route                              | Description                                                                                                                      |
| ------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/dashboard/summary`           | totaux, par statut/département, stockage utilisé, compteur de droits en attente — **adapté au rôle** (admin vs prof vs étudiant) |
| GET     | `/api/dashboard/activity?days=30`  | activité récente (audit)                                                                                                         |
| GET     | `/api/dashboard/expiring?days=30`  | documents proches de la fin de rétention                                                                                         |
| GET     | `/api/dashboard/uploads?months=12` | uploads par mois (graphique)                                                                                                     |
| GET     | `/api/dashboard/recent-documents`  | derniers documents visibles                                                                                                      |

### 4.7 Notifications, audit, rétention (P4-P5) — ✅ notifications (P4) · audit/rétention : P5

| Méthode | Route                                                              | Accès                           |
| ------- | ------------------------------------------------------------------ | ------------------------------- |
| GET     | `/api/notifications?unread=1&page`                                 | auth                            |
| GET     | `/api/notifications/unread-count`                                  | auth (badge UI)                 |
| PATCH   | `/api/notifications/<id>/read`, `POST /api/notifications/read-all` | auth                            |
| DELETE  | `/api/notifications/<id>`                                          | auth                            |
| GET     | `/api/audit?action&user_id&object_type&from&to&page`               | admin                           |
| GET     | `/api/audit/export`                                                | admin                           |
| GET     | `/api/admin/retention/status`                                      | admin                           |
| POST    | `/api/admin/retention/run` (`{dry_run:true}`)                      | admin (déclenchement manuel)    |
| GET     | `/api/admin/retention/reports?page`                                | admin (historique d'exécutions) |

### 4.8 Système

| Route                                              | Description                              |
| -------------------------------------------------- | ---------------------------------------- |
| `GET /health` (existant) + **`GET /health/ready`** | DB + Redis vérifiés (healthcheck Docker) |
| **`GET /api/version`**                             | version/commit/date (utile en prod)      |

---

## 5. Phase 0 — Fondations et corrections (bloquant, tout d'abord)

| ID    | Tâche                                                                                                                                                          | Livrable                   | Acceptation                               | **État**     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------- | ------------ |
| P0.1  | Supprimer le code mort : `app/routes.py` (`main_bp` jamais enregistré) + `app/common/` + `auth/error_handlers.py`                                              | commit                     | `grep main_bp` vide, app OK               | ✅ `4b520bd` |
| P0.2  | **Harness pytest** : `conftest.py` (app factory + config `testing` + base de test), fixtures `client`, `admin_session` (login + CSRF), helper `auth_headers()` | `tests/` opérationnels     | `pytest -q` passe sur le périmètre actuel | ✅ `22aec4b` |
| P0.3  | Réécrire les 3 scripts manuels en pytest ; **supprimer les références JWT** de `test_auth.py`                                                                  | suite auth complète        | 2FA/sessions/CSRF couverts                | ✅ `22aec4b` |
| P0.4  | **Enveloppe d'erreur** standardisée + handlers (400/401/403/404/409/413/422/429/500) + `code` stable                                                           | `app/errors.py`            | tests 404/401/403/413                     | ✅ `7bfe17f` |
| P0.5  | **Sérialiseurs** : `to_dict()` systématique + pagination helper partagé                                                                                        | `app/serializers.py`       | pas de JSON brut                          | ✅ `864856d` |
| P0.6  | **Seeds CLI idempotents** : `flask seed roles \| doctypes \| departments \| admin \| demo` (remplace le bloc monolithique d'`init_db.py`)                      | commandes                  | re‑exécution sans doublon                 | ✅ `b663241` |
| P0.7  | **CI GitHub Actions** : `ruff` + `pyright` + `pytest` (services `postgres:16` + `redis:7`) + `docker build`                                                    | `.github/workflows/ci.yml` | vert                                      | ✅ `1a4d613` |
| P0.8  | **Journal d'audit sur toutes les mutations** (`audit_hook` décorateur/flask `after_request` sur POST/PUT/PATCH/DELETE)                                         | helper                     | `GET /api/audit` (P5) montrera l'activité | ✅ `1253ee6` |
| P0.9  | Index DB présents dans la migration initiale (ou migration 2)                                                                                                  | migration                  | `EXPLAIN` sur les listes                  | ✅ `365db18` |
| P0.10 | Volume Docker pour les uploads (prévu dès P0 pour éviter une perte en P2)                                                                                      | `docker-compose.yml`       | `docker compose config` OK                | ✅ `fbbd077` |

**Estimation Phase 0 : ~6 j** — _critère de sortie : `pytest` vert + CI verte._

> **✅ Phase 0 livrée le 30/09/2026** (10/10 tâches, merge `a43310b`) : `pytest` vert sur **SQLite et
> PostgreSQL 16** (100 tests, couverture `app/` ≈ 72 %), `ruff` 0 violation, `pyright` 0 erreur,
> `docker build` + démarrage réels (entrypoint : `create_all` → stamp baseline → migration 2 → seeds →
> gunicorn, `/health` = 200). Le workflow CI est validé localement à l'identique ; il ne s'exécute
> qu'une fois le dépôt `backend/` poussé sur GitHub (aucun remote configuré à ce jour).

---

## 6. Découpage en phases

> Estimations en **jours‑homme** (1 développeur, ordre de grandeur) — à ajuster après lecture.

| Phase                | Contenu                                                                                                                | Est.      | Dépend de |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| **P0** ✅            | Fondations & corrections (§5) — **livrée le 30/09/2026**, 10/10 tâches, merge `a43310b`                                | 6 j       | —         |
| **P1** ✅            | **Institution + campus + réglages** (modèle, migration, API, cache, seeds) — **livrée le 01/10/2026**                  | 6 j       | P0        |
| **P2** ✅            | **Documents + dossiers + référentiels + stockage/upload/download/versions** — **livrée le 01/10/2026**                 | 14 j      | P1        |
| **P3** ✅            | **Permissions** (service complet, API, héritage, confidentialité, périmètre campus) + audit — **livrée le 01/10/2026** | 8 j       | P2        |
| **P4**               | **Recherche full‑text + dashboard + notifications**                                                                    | 8 j       | P2        |
| **P5**               | **Rétention/expiration + exports + bulk + durcissement** (perf, index, couverture, doc API)                            | 7 j       | P2‑P4     |
| **P6** _(optionnel)_ | OCR, chiffrement au repos, stockage S3, OpenAPI/Swagger                                                                | +8 j      | P5        |
|                      | **Total P0→P5**                                                                                                        | **~49 j** |           |

### P1 — Institution, campus, réglages

1. Migration Alembic : `institution`, `campus`, `setting` + colonnes `campus_id` + backfill + contraintes.
2. Modèles `Institution`, `Campus`, `Setting` + `to_dict()`.
3. **Registre de réglages** + `SettingService` (hiérarchie défaut→global→campus, cache Redis, purge).
4. `CampusService` (validation unicité code, protection suppression, bascule `is_active`).
5. Routes §4.1 + validation d'entrée + audit + tests (≥ 20 : CRUD, unicité, 409 sur suppression,
   hiérarchie de réglages, validation type/valeur, portée campus, purge cache).
6. Seeds : institution + campus `PRINCIPAL` + réglages d'usine ; migration des données existantes.
7. **Middleware de périmètre** : `g.current_campus_id` + helper `apply_campus_scope(query)`.

_Acceptation_ : migration `upgrade`/`downgrade` OK sur base existante avec données ; un admin peut
créer un 2ᵉ campus, y rattacher un département, et constater que la liste des documents est filtrée.

### P2 — Documents, structure, stockage

1. `StorageService` (local) + gestion de chemin sûr + `docker-compose` volume.
2. Upload : contrôles (taille 50 Mo via `MAX_CONTENT_LENGTH`, extensions `ALLOWED_EXTENSIONS`,
   **magic bytes**, SHA‑256, stockage versionné), `413/422` explicites.
3. Download streamé + audit + `Content-Disposition` sans nom utilisateur.
4. APIs dossiers (tree/path/move), départements (CRUD), types de documents, tags, rôles.
5. API documents (list/detail/create/patch/soft‑delete/restore/export) avec **préchargement eager**
   (`joinedload` : department, doc_type, folder, tags) → pas de requête N+1.
6. Versions (upload/list/restore) + tags.
7. Tests : ≥ 60 (upload refusé/accepté, traversal, checksum, version N+1, filtres, pagination,
   soft‑delete, droits basiques 403 sur un doc d'un autre campus).

_Acceptation_ : parcours réel complet API : créer campus → département → dossier → uploader 2
versions d'un PDF → lister/filtrer → télécharger → soft‑delete → restaurer.

### P3 — Permissions

1. `PermissionService` : les 3 méthodes `pass` deviennent les **6 règles** de D6, avec
   `explain()` retournant `{allowed, rule}` (débogage + tests lisibles).
2. Héritage dossiers (remontée récursive bornée, cache de résolution par requête).
3. Routes §4.4 + audit systématique (`permission_granted/revoked/denied`).
4. Intégration : `@require_permission('view', 'document')` appliqué sur les routes P2.
5. Tests : matrice de cas (admin/étudiant/département/autre campus/explicite‑interdit/rôle) ≥ 30 cas.

_Acceptation_ : la matrice de cas est **table‑driven** dans les tests ; aucune route ne renvoie un
document d'un autre campus.

### P4 — Recherche, dashboard, notifications

1. Index GIN + `tsvector` (fr) + `pg_trgm` ; migration dédiée.
2. API recherche : pagination, facettes, extrait surligné, sauvegarde `search_history`, temporisation.
3. Dashboard : 5 endpoints, agrégations SQL (`func.count`, `func.sum(size_bytes)`), variantes par rôle.
4. Notifications : création par événements (upload, droit accordé, rétention J‑30, alerte sécurité),
   endpoints de lecture/marquage, `unread-count`.
5. Tests : recherche sur jeu de données seedé, facettes cohérentes, agrégats, désactivation par rôle.

_Acceptation_ : les 4 écrans frontend (`dashboard`, `document-library`, `document-upload`,
`advanced-search`) **peuvent** être branchés sur ces endpoints sans changement de contrat.

### P5 — Rétention, bulk, durcissement

1. Calcul `retention_expires_at` + job `flask retention:run` + service `scheduler` (compose).
2. Politique d'échéance configurable (`archives.retention_*`), notification J‑30, archive → purge,
   `dry_run`, rapports exposés en API.
3. Actions groupées (`/documents/bulk`) + export.
4. Performance : `EXPLAIN ANALYZE` sur les 10 requêtes lourdes, index complémentaires, pagination
   en mode clé‑pagination si > 100 k documents (optionnel).
5. Durcissement : rate limits spécifiques (upload : 30/min), quotas par rôle, journal d'audit
   intégral, `GET /health/ready` branché sur les healthchecks Docker.
6. **Documentation API** : `assets/08_api_reference.md` (tables de routes, paramètres, erreurs,
   exemples) + README backend (démarrage, seeds, tests, migrations).

_Acceptation_ : `docker compose up --build` → seeds → parcours complet → CI verte → **couverture ≥ 80 %**
sur `app/services` et `app/**/routes.py`.

---

## 7. Stratégie de tests & CI

| Niveau          | Outil                                                           | Cible                               |
| --------------- | --------------------------------------------------------------- | ----------------------------------- |
| Unitaire        | `pytest` (services, registre de réglages, permissions, storage) | rapide, sans réseau                 |
| Intégration     | `pytest` + `client` (routes, transactions)                      | Postgres 16 + Redis 7 (services CI) |
| Contrat         | assertions d'enveloppe (`items/page/…`, `error/code`)           | 0 régression silencieuse            |
| Non‑fonctionnel | `ruff` (lint+format), **`pyright` (0 erreur, déjà acquis)**     | bloquant en CI                      |
| E2E             | hors périmètre (frontend)                                       | —                                   |

Fixtures clés : base de test **par‑session** avec `TRUNCATE … CASCADE` + seeds minimaux
(2 campus, 3 départements, 4 rôles, 1 admin, 1 prof, 1 étudiant, 5 documents de jeu de test).

---

## 8. Sécurité & performance (exigences permanentes)

- **Contrôle d'accès centralisé** : une seule porte d'entrée `PermissionService` — aucun accès
  direct aux documents dans les routes.
- **Upload** : extension + magic bytes + taille + chemin généré serveur + antivirus non requis ici.
- **Injection** : SQLAlchemy `filter()` uniquement (jamais de `text()` avec concaténation),
  tri par liste blanche de colonnes.
- **CSRF/session** : déjà en place ; les nouvelles routes POST/PUT/PATCH/DELETE héritent du décorateur.
- **Rate limiting** : limites déjà globales (Redis db1) → **spécifiques** sur upload et recherche.
- **Audit** : toute lecture d'un document confidentiel et toute mutation est tracée.
- **Performance** : `joinedload` obligatoire sur les listes, agrégats SQL (pas de calculs Python),
  index alignés sur les filtres, cache Redis des réglages.

---

## 9. Livrables documentaires (mise à jour des audits)

| Fichier                                           | À jour ?                     | Après                                      |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| `01…06`                                           | ✅ (déjà alignés)            | mises à jour mineures si contrats modifiés |
| **`07_plan_backend_multicampus.md`** (ce fichier) | ✅ validé + **P0→P5 cochés** | coché à chaque phase (suivi §13)           |
| `08_api_reference.md`                             | ✅ **créée (P5)**            | maintenue à chaque évolution d'API         |
| `03_etat_avancement.md`                           | ✅ à jour (**P5**)           | mise à jour à chaque fin de phase          |

---

## 10. Risques & atténuation

| #   | Risque                                                                   | Atténuation                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Migration sur base existante : perte/mauvais rattachement `campus_id`    | backfill **avant** les contraintes NOT NULL, `downgrade` testé, sauvegarde `pg_dump` obligatoire avant lancement                                                                                 |
| R2  | Nouvelles règles de permission = accès cassés pour des comptes existants | implémentées **avant** branchement des routes (P3), matrice de tests table‑driven, feature‑flag `permissions.enforced` (true par défaut, false = fallback ancien comportement) pour bascule sûre |
| R3  | **Uploads perdus** (pas de volume Docker aujourd'hui)                    | volume nommé ajouté en **P0.10**, avant toute écriture de fichier                                                                                                                                |
| R4  | Dérive du `campus_id` dénormalisé sur `document`                         | **chemin d'écriture unique** (service), contrainte NOT NULL + trigger de cohérence optionnel, test d'intégrité                                                                                   |
| R5  | Recherche full‑text : mauvais classement en français                     | config `french` + `pg_trgm`, jeu de test dédié, fallback `ILIKE`                                                                                                                                 |
| R6  | Dérive du périmètre (« pendant qu'on y est, ajoutons X »)                | chaque tâche est numérotée ; toute demande hors liste = nouvelle ligne dans ce plan, puis validation                                                                                             |
| R7  | Charge : ~49 j                                                           | ordre de priorité clair P0→P2→P3 → dès P2 le produit est démontrable                                                                                                                             |

---

## 11. Questions à trancher — ✅ VALIDÉES le 30/09/2026

> Réponses brutes de l'utilisateur conservées en italique ; la ligne « Décision » est celle
> retenue pour l'implémentation. **Toute tâche s'appuie sur ce tableau.**

| #   | Question                             | Réponse de l'utilisateur (_brut_)                                                                                          | **Décision retenue**                                                                                                                                                                                                             |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Référentiels globaux ou par campus ? | _R-globaux_                                                                                                                | **Globaux** : `role`, `doc_type`, `tag`, niveaux de confidentialité partagés entre les campus.                                                                                                                                   |
| 2   | Rattachement campus des utilisateurs | _R- Oui mais paramétrable par le super admin qui lui peut gérer les admins et les associé aux campus / R- Oui obligatoire_ | `campus_id` **obligatoire** pour tous (prof, étudiant, secrétaire…) ; le **super admin** peut associer un admin **à un campus ou à aucun** (accès global). Contrainte : si `role = super_admin` alors `campus_id NULL` autorisé. |
| 3   | Périmètre strict                     | _R- Oui il est filtré partout_                                                                                             | **Filtrage imposé partout**, au niveau repository — jamais seulement un filtre d'UI. Un compte hors campus obtient `403` (pas un résultat vide trompeur).                                                                        |
| 4   | Suppression campus/département       | _R- Seul le super admin "bascule inactif"_                                                                                 | **Aucune suppression physique** : bascule `is_active = false` **réservée au super admin** ; `409` si des documents/y sont rattachés (le super admin peut rattaché à un autre campus ou les désactiver seulement).                |
| 5   | Stockage fichiers                    | _R- local + volume Docker aujourd'hui, interface prête pour S3_                                                            | **Local + volume Docker**, derrière `StorageService` (implémentation `S3Storage` ajoutable sans toucher aux routes).                                                                                                             |
| 6   | Jobs rétention                       | _R- D7 : commande `flask retention:run` + petit service scheduler en compose, sans Celery_                                 | **D7 retenue** : CLI `flask retention:run [--dry-run]` + service `scheduler` dans `docker-compose.yml`. Pas de Celery/APScheduler.                                                                                               |
| 7   | OCR                                  | _R- Oui_                                                                                                                   | **Oui, mais en P6 (optionnel)** — conformément à la recommandation « plus tard ». _À confirmer : si tu voulais « dès P2 », dis-le avant la phase._                                                                               |
| 8   | Ordre des phases                     | _R- Oui_                                                                                                                   | **P0 → P1 → P2 → P3** : fondations, puis campus/réglages, puis documents, puis permissions.                                                                                                                                      |
| 9   | Génération de cote / matricule       | _R- Oui_                                                                                                                   | **Réglage `archives.*` dès P1** : templates de cote et de matricule configurables (format `{CAMPUS}{ANNEE}{SÉQ}`).                                                                                                               |
| 10  | Périmètre frontend                   | _R- Ne touche pas le frontend, juste mettre à jour les documents dans /assets pour le suivi réel de ce qui est implémenté_ | **Frontend intact.** Seuls les documents `/assets/*` sont mis à jour à chaque étape (cases cochées, statut des phases, API implémentées).                                                                                        |

**Conséquences directes sur la rédaction du plan :**

- **Q4** : la règle D2 « suppression = bascule inactif » est **renforcée** (super admin uniquement) →
  la route `DELETE /api/campuses/<id>` devient `PATCH /api/campuses/<id>/status` + garde de rôle.
- **Q2/Q3** : `user_account.campus_id` = `NOT NULL` pour tous les rôles sauf super admin, et
  `apply_campus_scope()` devient **obligatoire** dans tous les repositories (test d'accès inter-campus
  obligatoire en P3).

---

## 12. Checklist de validation finale (« backend 100 % »)

- [x] Tous les endpoints de §4 implémentés et documentés (`08_api_reference.md`) — P0→P5 ; P6 (OCR/S3/OpenAPI) optionnel.
- [x] `PermissionService` pleinement implémenté ; **aucune** route n'oublie le contrôle d'accès (décorateur `@require_permission`).
- [x] Upload → version → téléchargement → soft‑delete → restauration : parcours complet testé (P2).
- [x] Recherche full‑text, dashboard et notifications répondent sans mock (P4 : `/api/search`, `/api/dashboard/*`, `/api/notifications/*`).
- [~] Multi‑campus : création de campus, rattachement et `403` inter‑campus **faits et testés** (P1) ; le filtrage automatique `apply_campus_scope()` est prêt mais sera branché sur les repositories documents/utilisateurs en P2/P3.
- [~] Réglages : modifiables par l'admin, hiérarchie global→campus, cache invalidé — **fait (P1)** ; reste à alimenter les écrans frontend.
- [x] Rétention calculée, job exécuté, rapports consultables (P5 : CLI `flask retention`, scheduler compose, `/api/admin/retention/*`).
- [x] `pytest` ≥ **80 %** de couverture sur `app/services` et `routes` (**82 % global**, 92‑100 % sur rétention/audit), `pyright` 0 erreur ; CI verte ⏳ à valider au push.
- [ ] `docker compose up --build` sur machine propre → seeds → application utilisable de bout en bout (service `scheduler` P5 ajouté, à rejouer).
- [x] Documents `03`/`07`/`08` à jour.

---

### Annexe A — Arborescence cible du backend

```text
backend/
├── config.py                  # +UPLOAD, réglages métier
├── extensions.py
├── init_db.py                 # → délègue aux commandes `flask seed *`
├── migrations/
│   └── versions/23042faea7a9_create_all_tables.py   # immuable
│                            + 23xxxx_campus_institution_setting.py
├── app/
│   ├── __init__.py            # create_app : extensions, sécurité, scopes, blueprints, /health(/ready)
│   ├── errors.py              # enveloppe d'erreur + codes
│   ├── serializers.py         # to_dict() + pagination
│   ├── models/                # + institution.py, campus.py, setting.py
│   ├── settings/              # registry.py, service.py (hiérarchie + cache Redis)
│   ├── campuses/              # routes, services, repositories
│   ├── documents/             # routes, services, repositories   (CRUD + versions + bulk)
│   ├── storage/               # base.py (interface), local.py, S3 (futur)
│   ├── folders/               # arborescence + chemins
│   ├── referentials/          # doc-types, tags, roles, departments
│   ├── permissions/           # service (règles D6), routes
│   ├── search/                # full-text + historique
│   ├── dashboard/             # agrégats
│   ├── notifications/         # routes + service d'événements
│   ├── audit/                 # lecture/export + hook de traçabilité
│   ├── retention/             # calcul + job + rapports
│   ├── auth/  users/          # existants (inchangés, améliorations ciblées)
│   └── cli.py                 # flask seed / flask retention:run / flask campus:create
├── tests/
│   ├── conftest.py            # app factory, DB de test, sessions auth/admin
│   ├── factories.py
│   ├── test_auth_*.py  test_users_*.py
│   ├── test_campus_settings_*.py   # P1
│   ├── test_documents_storage_*.py # P2
│   ├── test_permissions_*.py       # P3
│   ├── test_search_dashboard_*.py  # P4
│   └── test_retention_*.py         # P5
└── uploads/                   # volume Docker (ignoré par git)
```

### Annexe B — Ordre d'exécution recommandé (résumé visuel)

```text
P0 fondations ─► P1 campus + réglages ─► P2 documents + stockage ─► P3 permissions
                                                          │
                                                          ├──► P4 recherche + dashboard + notifications
                                                          └──► P5 rétention + bulk + durcissement + doc
                                                                            └─► P6 (optionnel) OCR / S3 / OpenAPI
```

**Phase P6 soldée** : les 5 lots de §13.7 ont été livrés et mergés `--no-ff` le 01/10/2026
(OpenAPI → OCR → chiffrement → S3 → perf), suite verte après chaque lot.
**Préalable soldé** : les merges `--no-ff` de la pile P1→P5 vers `master` ont été effectués le
01/10/2026 (5 merges, suite verte : 303 tests, `ruff` 0 violation, `pyright` 0 erreur).

### 13.7 Suivi de phase P6 (✅ 01/10/2026)

| Lot P6                                                                                | Branche          | État                 |
| ------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| OpenAPI/Swagger : spec générée depuis la carte des routes + console `/api/docs`       | `p6-openapi`     | ✅ (merge `f44d6ed`) |
| OCR synchrone à l'upload (remplissage de `ocr_text`, derrière `features.ocr_enabled`) | `p6-ocr`         | ✅ (merge `fec3354`) |
| Chiffrement au repos des niveaux `confidential`/`secret` (`is_encrypted`)             | `p6-chiffrement` | ✅ (merge `d9cf1c2`) |
| Stockage S3/MinIO (`S3Storage` derrière `get_storage()`)                              | `p6-s3`          | ✅ (merge `e789928`) |
| Perf (reliquat §7.5.4 : `EXPLAIN ANALYZE`, keyset pagination)                         | `p6-perf`        | ✅ (merge `47174d2`) |

---

## 13. Suivi d'avancement

> Mis à jour à **chaque fin de phase** (le détail des tâches reste dans §5, §7, §8).

| Phase                                       | Statut        | Date       | Livraison                                                                                                                                                                                        |
| ------------------------------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0** — fondations & corrections           | ✅ **livrée** | 30/09/2026 | 10/10 tâches (§5) · branche `p0-fondations` → merge `--no-ff` **`a43310b`** sur `master`                                                                                                         |
| **P1** — institution + campus + réglages    | ✅ **livrée** | 01/10/2026 | modèles `Institution`/`Campus`/`Setting`, migration `f1a2b3c4d5e6`, API §4.1, registre de réglages, seeds · détail §13.2                                                                         |
| **P2** — documents + stockage               | ✅ **livrée** | 01/10/2026 | `StorageService` local, API documents/versions/dossiers/référentiels, permissions de base · détail §13.3                                                                                         |
| **P3** — permissions                        | ✅ **livrée** | 01/10/2026 | moteur D6 complet, héritage dossiers, API `/api/permissions/*`, décorateur centralisé · détail §13.4                                                                                             |
| **P4** — recherche + dashboard + notifs     | ✅ **livrée** | 01/10/2026 | full‑text `tsvector`/`pg_trgm` (migration `b4c5d6e7f8a9`), `/api/search` + facettes + historique, 5 endpoints dashboard, `/api/notifications/*` · détail §13.5                                   |
| **P5** — rétention + exports + durcissement | ✅ **livrée** | 01/10/2026 | job `flask retention` + scheduler compose, migration `c5d6e7f8a9b0`, `/api/admin/retention/*`, `/api/audit` + export CSV, `/health/ready` + `/api/version`, `08_api_reference.md` · détail §13.6 |
| **P6** — OCR / S3 / OpenAPI                 | ✅ **livrée** | 01/10/2026 | lots : OpenAPI ✅ · OCR synchrone ✅ · chiffrement au repos ✅ · S3 ✅ · perf ✅ (5 merges `--no-ff`) — détail §13.7                                                                             |

### 13.6 Sortie de phase P5 (✅ 01/10/2026)

| Livrable P5                                                                                                                                                                                                                                                                                                                                                | État |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Cycle de rétention (`RetentionService.run`) : préavis `retention_warning` J‑30 dédupliqué (désactivable par réglage campus), archivage à l'échéance (audit `document_archived`), purge après `retention_purge_after_days` (fichiers + droits supprimés, `AuditLog.document_id` détaché), `dry_run`, désactivation globale par `archives.retention_enabled` | ✅   |
| Réglages ajoutés au registre : `archives.retention_auto_archive`, `archives.retention_purge_after_days` (résolution défaut → global → campus)                                                                                                                                                                                                              | ✅   |
| Rapports persistés : table `retention_report` + index portables (migration `c5d6e7f8a9b0`, idempotente, upgrade → downgrade → upgrade vérifiés)                                                                                                                                                                                                            | ✅   |
| CLI `flask retention run [--dry-run] [--campus-id]` / `retention status` + service compose `scheduler` (boucle quotidienne, `RETENTION_INTERVAL_SECONDS`)                                                                                                                                                                                                  | ✅   |
| API `/api/admin/retention/status\|run\|reports` (super admin, exécution auditable `retention_run`)                                                                                                                                                                                                                                                         | ✅   |
| Audit consultable : `GET /api/audit` (paginé, filtres action/object_type/user_id/from/to, scoping D6, 403 inter‑campus) + `GET /api/audit/export` (CSV plafonné 10 000 lignes) ; dashboard `activity` refactorisé sur `audit_service.list_entries`                                                                                                         | ✅   |
| Durcissement : rate limit upload document/version `30/min`, recherche `60/min` (`120/min` admin), `GET /health/ready` (DB + Redis, 503 si dégradé) et `GET /api/version` (`APP_VERSION`/`GIT_COMMIT`/`APP_BUILD_DATE`)                                                                                                                                     | ✅   |
| README backend (`backend/README.md`) : démarrage, migrations, seeds, rétention CLI/API, tests                                                                                                                                                                                                                                                              | ✅   |
| Doc API : `assets/08_api_reference.md` (routes P0→P5, paramètres, codes d'erreur, exemples)                                                                                                                                                                                                                                                                | ✅   |
| Tests : **+35 cas** (cycle rétention, API super admin, CLI, audit API/scoping/export, readiness/version, contrats schéma étendus P5)                                                                                                                                                                                                                       | ✅   |

**Validation** : `pytest` **300 passés / 7 ignorés**, `ruff` 0 violation, `pyright` 0 erreur ;
couverture `app/` ≈ **82 %** (`retention_service` 98 %, `audit_service` 92 %, routes audit/rétention
100 %) — objectif ≥ 80 % atteint ; migration `upgrade` → `downgrade` → `upgrade` vérifiée sur SQLite.

Tâche §7.5.4 (performance : `EXPLAIN ANALYZE`, keyset pagination > 100 k documents) : **reportée
en P6 et traitée** (§13.7, branche `p6-perf`).

### 13.5 Sortie de phase P4 (✅ 01/10/2026)

| Livrable P4                                                                                                                                                                                                                                                      | État |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Migration `b4c5d6e7f8a9` : index composites `notification`/`search_history`, colonne `document.search_vector` (trigger poids A/B/C, backfill), index GIN `tsvector` + `pg_trgm` (PostgreSQL uniquement)                                                          | ✅   |
| `/api/search` : `websearch_to_tsquery('french')` + similarité trigramme, tri pertinence `ts_rank`, extrait `ts_headline`, facettes (types/départements/statuts/confidentialités), `took_ms`, pagination                                                          | ✅   |
| Fallback portable (`ILIKE` + extrait découpé) sur les autres dialectes — les tests SQLite couvrent ce chemin, le chemin PostgreSQL est exercé par la CI Docker                                                                                                   | ✅   |
| `/api/search/history` : enregistrement automatique (dédupliqué), liste paginée, vidage                                                                                                                                                                           | ✅   |
| `/api/dashboard/summary` (totaux, statuts, départements, stockage, échéances, compteurs `me`), `/activity` (audit borné au périmètre, actions propres pour un utilisateur), `/expiring` (+ `overdue`), `/uploads` (12-24 mois, zéro rempli), `/recent-documents` | ✅   |
| `/api/notifications` : liste (`unread=1`), `unread-count`, `read`, `read-all`, `delete` (404 si non propriétaire)                                                                                                                                                | ✅   |
| Événements émetteurs : dépôt de document (admins du campus + super admins, hors auteur), droit accordé (document/dossier, sauf auto‑attribution et re‑octroi)                                                                                                    | ✅   |
| Contrat d'index étendu (`test_indexes.py` : `EXPECTED_P4` + DDL PostgreSQL gardé hors SQLite)                                                                                                                                                                    | ✅   |
| Harness : client HTTP **dédié par session** (plusieurs sessions authentifiées par test)                                                                                                                                                                          | ✅   |
| Tests : **+47 cas** (recherche/facettes/historique, dashboard par rôle et campus, cycle de vie notifications)                                                                                                                                                    | ✅   |

**Validation** : `pytest` **265 passés / 7 ignorés**, `ruff` 0 violation, `pyright` 0 erreur ;
migration `upgrade` → `downgrade` → `upgrade` vérifiée sur SQLite.

Nota : le compteur « droits en attente » du dashboard (§4.6) est sans objet dans D6 — les octrois
sont immédiats, il n'y a pas de workflow de validation de droit.

### 13.2 Sortie de phase P1 (✅ 01/10/2026)

Décision de rattachement : **`Admin` sans campus = super administrateur** (gestion des campus,
des admins et des réglages globaux) ; un `Admin` rattaché à un campus ne pilote que son campus.

| Livrable P1                                                                                                                                 | État                 |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Modèles `Institution` (ligne unique), `Campus`, `Setting`                                                                                   | ✅                   |
| `campus_id` sur `department` (NOT NULL), `folder`, `user_account`, `document` (NOT NULL) + `retention_expires_at`/`updated_at`/`deleted_by` | ✅                   |
| Migration `f1a2b3c4d5e6` idempotente (create_all‑safe), backfill vers `PRINCIPAL`, `upgrade`/`downgrade` testés                             | ✅                   |
| `UNIQUE(campus_id, code)` sur `department` (fin de l'unicité globale)                                                                       | ✅                   |
| Registre typé (`app/settings/registry.py`) + `SettingService` (défaut → global → campus, cache Redis/mémoire, purge)                        | ✅                   |
| API §4.1 : `/api/institution`, `/api/campuses` (+ `/status`), `/api/settings` (+ `/schema`, `/public`, `/defaults`)                         | ✅                   |
| `apply_campus_scope()` + `is_super_admin()` + décorateur `super_admin_required`                                                             | ✅ (prêt pour P2/P3) |
| Seeds : institution, campus `PRINCIPAL`, réglages d'usine (idempotents)                                                                     | ✅                   |
| Tests : **35 cas P1** (CRUD, unicité, 409, non‑suppression, portée campus, hiérarchie, validation, CSRF, audit)                             | ✅                   |

**Validation** : `pytest` **129 passés / 7 ignorés**, `ruff` 0 violation, `pyright` 0 erreur,
migration `upgrade`/`downgrade` vérifiée sur base préexistante. Note : la migration PostgreSQL
(`ALTER … SET NOT NULL`, FK, retrait de l'ancien `UNIQUE(code)`) est exercée par la CI Docker ;
le chemin SQLite (tests) est couvert via `create_all`.

### 13.3 Sortie de phase P2 (✅ 01/10/2026)

| Livrable P2                                                                                                                          | État                      |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| `StorageService` local (`app/storage/`) : sauvegarde, flux, suppression, chemin sûr (`..` bloqué)                                    | ✅                        |
| Validation upload : extension autorisée + **magic bytes** + checksum SHA‑256                                                         | ✅                        |
| Documents : `GET/POST /api/documents`, détail, `PATCH`, soft‑delete/restore, `bulk`, `export` CSV                                    | ✅                        |
| Versions : upload, liste, téléchargement streamé (nom généré, audit), restauration, `preview`                                        | ✅                        |
| Tags : ajout/retrait sur un document (`POST/DELETE /api/documents/<id>/tags`)                                                        | ✅                        |
| Dossiers (`/api/folders`) : liste/tree, chemin, création, mise à jour, déplacement (anti‑cycle), suppression non vide `409`          | ✅                        |
| Référentiels : départements, types, tags, rôles (CRUD, unicité, `409` si utilisé)                                                    | ✅                        |
| Permissions de base : périmètre campus, confidentialité, droits explicites utilisateur/rôle                                          | ✅ (détail complet en P3) |
| Filtrage : `apply_campus_scope` appliqué aux documents, dossiers, départements                                                       | ✅                        |
| Tests : **+46 cas P2** (documents, versions, upload refusé/accepté, traversal, download, tags, dossiers, référentiels, inter‑campus) | ✅                        |

**Validation** : `pytest` **183 passés / 7 ignorés**, `ruff` 0 violation, `pyright` 0 erreur.
Aucune nouvelle table n'était requise : P2 s'appuie sur le schéma P0/P1 (documents, versions, tags,
dossiers, droits).

### 13.4 Sortie de phase P3 (✅ 01/10/2026)

Moteur conforme à D6, par ordre de priorité (**première règle gagnante**) :

1. périmètre campus (non super admin) → `campus` ;
2. droit explicite utilisateur sur le document (`explicit_user`) ;
3. héritage dossier utilisateur puis rôle (`folder_user`, `folder_role`) ;
4. droit rôle sur le document (`explicit_role`) ;
5. `Admin` (hors refus explicite) → `admin` ;
6. confidentialité (`public`/`internal`/`confidential`/`secret`) ;
7. sinon refus (`no_grant`).

| Livrable P3                                                                                                             | État |
| ----------------------------------------------------------------------------------------------------------------------- | ---- |
| `PermissionService.explain()` → `{allowed, rule}` (débogable) et `effective()` (4 actions)                              | ✅   |
| Héritage dossier borné (remontée anti‑cycle) + **cache de résolution par requête** (`flask.g`)                          | ✅   |
| Attribution/révocation : document × (utilisateur\|rôle), dossier × (utilisateur\|rôle)                                  | ✅   |
| API `/api/permissions/*` (§4.4) : effective, grants, grant/revoke, `/check`                                             | ✅   |
| Décorateur centralisé `@require_permission(action, 'document')` appliqué aux routes documents                           | ✅   |
| Audit : `permission_granted`, `permission_revoked`, `permission_denied` (avec la règle)                                 | ✅   |
| Tests : **+35 cas** (matrice table‑driven admin/étudiant/département/autre campus/explicite‑interdit/rôle/sous‑dossier) | ✅   |

**Validation** : `pytest` **218 passés / 7 ignorés**, `ruff` 0 violation, `pyright` 0 erreur.

### 13.1 Sortie de phase P0 (✅ 30/09/2026)

| Critère                                         | Résultat                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pytest` vert                                   | ✅ **100 tests**, sur **SQLite et PostgreSQL 16** (couverture `app/` ≈ **72 %**)                                                                                                          |
| CI (P0.7)                                       | ✅ `.github/workflows/ci.yml` (ruff + pyright + pytest + `docker build`) **validé à l'identique en local** ; ⏳ exécution GitHub dès le push du dépôt `backend/` (aucun remote à ce jour) |
| `pyright` 0 erreur                              | ✅ 0 erreur (depot racine **et** `backend/`)                                                                                                                                              |
| `ruff` (E9 + F)                                 | ✅ 0 violation (13 imports morts supprimés)                                                                                                                                               |
| `docker build` + démarrage réel                 | ✅ entrypoint complet : `create_all` → stamp `23042faea7a9` → migration `e5f0a1b2c3d4` → seeds → gunicorn, `/health` = 200                                                                |
| `docker compose config` + volume `uploads_data` | ✅ P0.10                                                                                                                                                                                  |

**Commits P0** (dépôt `backend/`) : `4b520bd` (P0.1) · `22aec4b` (P0.2/P0.3) · `7bfe17f` (P0.4) ·
`864856d` (P0.5) · `b663241` (P0.6) · `1253ee6` (P0.8) · `365db18` (P0.9) · `fbbd077` (P0.10) ·
`1a4d613` (P0.7) · merge **`a43310b`**.

---

## 14. Demandes additionnelles (règle R6)

> Lignes ajoutées **après** la validation initiale (§11), au titre de la règle **R6** : tout besoin
> hors liste devient une ligne de ce plan, puis est estimé et implémenté comme une phase normale.
> Origine : rédaction du [plan frontend](07_plan_frontend_multicampus.md) (§6 F5/F6 et §11 Q6/Q7) —
> deux écrans mockés n'ont **aucun endpoint** à appeler.

| ID        | Besoin                                                                                                                                             | Endpoint proposé                                                                                                                                    | Garde                                                                | État                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------- |
| **R6‑01** | **Recherches sauvegardées** : enregistrer une requête (nom + critères), la relancer, la supprimer depuis la liste                                  | `GET /api/search/saved` · `POST /api/search/saved` · `DELETE /api/search/saved/<id>` — table `search_saved` (utilisateur, campus, `criteria` JSONB) | `@session_required` — chacun ne voit **que** les siennes (404 sinon) | ✅ retenue 02/10/2026 |
| **R6‑02** | **Actions groupées utilisateurs** : activer/désactiver des comptes, réinitialiser les mots de passe, changer de rôle/département sur une sélection | `POST /api/users/bulk` — corps `{action, user_ids[], role_id?, department_id?}` **aligné sur `POST /api/documents/bulk`** (P5)                      | `@admin_required` + audit systématique (`user_updated` × N)          | ✅ retenue 02/10/2026 |

**Acceptation commune** : validation d'entrée (`400 validation_error`), enveloppe de résultat
`{action, succeeded, errors[]}` cohérente avec `app/errors.py`, couverture automatique dans
`/api/openapi.json` (aucune annotation manuelle), mise à jour de `assets/08_api_reference.md`, et
**≥ 8 tests** par ligne : succès, rôle insuffisant `403`, id inconnu `404`, action invalide `400`,
hors périmètre campus `403`, ids mixtes (partiellement refusés), journal d'audit vérifié,
rejeu idempotent.

**Estimation** : **R6‑01 ≈ 1 j** · **R6‑02 ≈ 1 j** → **P7 « confort frontend » ≈ 2 j**.

**Décision (02/10/2026)** : les **deux lignes sont retenues** — les écrans frontend seront
branchés dessus (F5 pour R6‑01, F6 pour R6‑02). Implémentation en **P7 « confort frontend » (~2 j)**,
à programmer **après** la correction des défauts repérés par le test de bout en bout (§13) et avant
ou pendant F5/F6 du plan frontend. Les alternatives `localStorage` / masquage des actions groupées
sont écartées.
