# UniArchive — Référence API (P0 → P6)

> Document n°8 — complète [02_architecture_technique.md](02_architecture_technique.md) (§5) et le
> contrat [07_plan_backend_multicampus.md](07_plan_backend_multicampus.md) §4. État au 01/10/2026,
> backend livré jusqu'à **P6** : P0→P5 (fondations, documents, permissions, recherche, rétention)
> puis les 5 lots P6 — OpenAPI, OCR, chiffrement au repos, S3/MinIO et performance.

---

## 1. Conventions transverses

### 1.1 Authentification

- **Session opaque** (pas de JWT) : après `POST /api/auth/verify-2fa`, le serveur pose deux cookies —
  `uniarchive_session` (**HTTPOnly**) et `uniarchive_csrf` (lisible JS, double-submit).
- Toute requête authentifiée porte les cookies ; **toute mutation** (POST/PUT/PATCH/DELETE) doit
  répéter le token CSRF dans l'en-tête `X-CSRF-Token`.
- Décorateurs : `@session_required` (401 sinon) ; `@admin_required` (403) ; `@super_admin_required`
  (403) — **super admin = `Admin` sans `campus_id`**.

### 1.2 Réponses

- **Succès** : le format natif de la route (souvent `{items, page, per_page, total, pages}` pour les
  listes paginées — `app/serializers.py`).
- **Erreur** : enveloppe unique `{"error": <message>, "code": <code stable>, "details": {...}?}`
  (`app/errors.py`).

### 1.3 Codes d'erreur récurrents

| HTTP | Code                  | Quand                                              |
| ---- | --------------------- | -------------------------------------------------- |
| 400  | `validation_error`    | paramètre absent/invalide                          |
| 401  | `unauthorized`        | session absente/expirée                            |
| 403  | `forbidden`          | rôle insuffisant                                   |
| 403  | `cross_campus_access` | accès à un autre campus (garde D2/D6)              |
| 403  | `no_campus_scope`     | compte Admin sans campus hors opérations super admin |
| 404  | `not_found`           | ressource absente ou hors périmètre                |
| 409  | `conflict`            | unicité / suppression de ressource rattachée       |
| 413  | `payload_too_large`   | fichier > 50 Mo                                    |
| 422  | `unprocessable`       | extension/magic bytes/contenu refusé               |
| 429  | `rate_limited`        | quota Flask-Limiter dépassé                        |

### 1.4 Pagination

Paramètres communs `?page=1&per_page=20` (plafonnée) ; réponse `{items, page, per_page, total, pages}`.

### 1.5 Rate limiting (P5)

| Cible                                   | Limite              |
| --------------------------------------- | ------------------- |
| `POST /api/auth/login`                  | 5/min               |
| `POST /api/auth/verify-2fa`             | 10/min              |
| Global (défaut)                         | 200/min             |
| Upload document/version (`POST /api/documents*`) | **30/min** |
| `GET /api/search` (rôle Admin)          | 120/min             |
| `GET /api/search` (autres rôles)        | 60/min              |

---

## 2. §4.1 Institution, campus, réglages (P1)

| Méthode        | Route                    | Accès  | Description |
| -------------- | ------------------------ | ------ | ----------- |
| GET            | `/api/institution`       | public | profil institution |
| PUT            | `/api/institution`       | admin  | mise à jour |
| GET            | `/api/campuses`          | auth   | liste (`?active_only=1`) |
| POST           | `/api/campuses`          | admin  | création |
| GET/PUT/DELETE | `/api/campuses/<id>`     | admin  | détail / maj / suppression (`409` si rattachements → préférer `PATCH /status`) |
| PATCH          | `/api/campuses/<id>/status` | super admin | bascule `is_active` (aucune suppression physique) |
| GET            | `/api/settings`          | admin  | valeurs effectives (hiérarchie résolue) |
| GET            | `/api/settings/schema`   | admin  | registre typé (types, défauts, aide) |
| GET            | `/api/settings/public`   | public | logo, langue, extensions, taille max… |
| PUT            | `/api/settings`          | admin  | batch `{key, value, campus_id?}` validé + purge cache |
| GET            | `/api/settings/defaults` | admin  | valeurs d'usine |

---

## 3. §4.2 Structure : dossiers, départements, types, tags (P2)

| Méthode               | Route                                    | Accès                             |
| --------------------- | ---------------------------------------- | --------------------------------- |
| GET                   | `/api/folders?campus_id&department_id&parent_id` (ou `view=tree`) | auth |
| GET                   | `/api/folders/<id>/path`                 | auth                              |
| POST                  | `/api/folders`                           | admin/Secrétaire                  |
| PATCH/DELETE          | `/api/folders/<id>` (`409` si non vide, anti-cycle au move) | admin          |
| POST                  | `/api/folders/<id>/move`                 | admin                             |
| GET/POST              | `/api/departments`                       | liste : auth · création : admin   |
| GET/PATCH/DELETE      | `/api/departments/<id>`                  | admin                             |
| GET/POST/PATCH/DELETE | `/api/doc-types[/<id>]`                  | lecture : auth · écriture : admin |
| GET/POST/DELETE       | `/api/tags[/<id>]`                       | lecture : auth · écriture : admin |
| GET/POST/PUT/DELETE   | `/api/roles[/<id>]`                      | admin                             |

> Alias conservés pour le frontend : `GET /api/users/roles`, `GET /api/users/departments`.

---

## 4. §4.3 Documents, versions, téléchargement (P2)

| Méthode     | Route                                         | Description |
| ----------- | --------------------------------------------- | ----------- |
| GET         | `/api/documents`                              | filtres `q, folder_id, department_id, campus_id*, doc_type_id, status, confidentiality, tag_ids[], created_from/to, sort, page, per_page` (*super admin) |
| GET         | `/api/documents/<id>`                         | détail + versions + tags + droits |
| POST        | `/api/documents`                              | création (JSON ou `multipart` avec fichier → v1) — **rate limit 30/min** |
| PATCH       | `/api/documents/<id>`                         | mise à jour (journalisée) |
| DELETE      | `/api/documents/<id>`                         | **soft delete** (`status='deleted'`) |
| POST        | `/api/documents/<id>/restore`                 | restauration |
| POST        | `/api/documents/bulk`                         | `move / delete / restore / confidentiality` sur `{ids[]}` |
| POST        | `/api/documents/<id>/versions`                | upload v N+1 (taille, extension, **magic bytes**, SHA-256) — **rate limit 30/min** |
| GET         | `/api/documents/<id>/versions`                | historique |
| GET         | `/api/documents/<id>/versions/<vid>/download` | flux streamé (`Content-Disposition` sûr, audit `document_downloaded`) |
| POST        | `/api/documents/<id>/versions/<vid>/restore`  | replier une version |
| GET         | `/api/documents/<id>/preview`                 | inline PDF/images |
| POST/DELETE | `/api/documents/<id>/tags`                    | étiquetage |
| GET         | `/api/documents/export`                       | CSV |

Contrôle d'accès : décorateur `@require_permission(action, 'document')` (moteur D6, P3).

**OCR (P6)** : quand le réglage `features.ocr_enabled` est actif, chaque dépôt (et chaque
restauration de version) remplit `document.ocr_text` — PDF via leur couche texte (`pypdf`),
images via Tesseract (`OCR_LANGUAGES`) — ce qui alimente la recherche et son extrait surligné.
Extraction **best-effort** : moteur absent, fichier illisible ou délai dépassé (`OCR_TIMEOUT_SECONDS`)
→ `ocr_text` reste vide, l'enregistrement réussit quand même.

**Chiffrement au repos (P6)** : avec `FILE_ENCRYPTION_KEY`, un document dont le niveau figure dans
`ENCRYPTED_LEVELS` (défaut `confidential,secret`) est scellé à l'upload (AES-GCM par blocs de
64 Ko, marque `UNIARCH\x01`). `checksum`, `size_bytes` et `is_encrypted` décrivent alors le
**clair** ; téléchargement, aperçu et OCR déchiffrent à la volée. Sans clé, rien n'est chiffré ;
clé mal formée → refus du démarrage ; clé absente ou pièce altérée à la lecture → erreur `500`
structurée (`encrypted_file_unreadable`).

**Pagination (P6)** : `GET /api/documents` accepte `pagination=offset` (défaut, contrat
`page/per_page/total/pages`) ou `pagination=keyset` — réponse `{items, per_page, has_more,
next_cursor}` **sans `COUNT(*)`** puis `&cursor=<next_cursor>` pour la page suivante. Le coût d'une
page est indépendant de sa position (cas > 100 k documents, §7.5.4). Le curseur reprend le tri
élu : tri changé → `400 cursor_invalid`, `sort=size_bytes` (nullable) → `400
cursor_unsupported_sort`, mode inconnu → `400 invalid_pagination`. `flask perf explain` affiche le
plan d'exécution des 10 requêtes lourdes.

---

## 5. §4.4 Permissions (P3)

| Méthode    | Route                                                       | Description |
| ---------- | ----------------------------------------------------------- | ----------- |
| GET        | `/api/permissions/document/<id>`                            | droits effectifs du courant + règle appliquée |
| GET        | `/api/permissions/document/<id>/grants`                     | liste des accords |
| PUT        | `/api/permissions/document/<id>/user/<uid>`                 | accorder `can_view/download/edit/delete` |
| DELETE     | `/api/permissions/document/<id>/user/<uid>`                 | révoquer |
| PUT        | `/api/permissions/document/<id>/role/<role_id>`             | accord au rôle |
| PUT/DELETE | `/api/permissions/folder/<id>/{user/<uid>\|role/<role_id>}` | droits héritables |
| POST       | `/api/permissions/check`                                    | `{subject, object, action}` → `{allowed, rule}` (débogage admin) |

Actions auditées : `permission_granted`, `permission_revoked`, `permission_denied`.

---

## 6. §4.5 Recherche (P4)

| Méthode | Route                          | Description |
| ------- | ------------------------------ | ----------- |
| GET     | `/api/search?q=&department_id&doc_type_id&tag_ids&date_from&date_to&page` | full-text PostgreSQL (`websearch_to_tsquery('french')` + `pg_trgm`), facettes, extrait surligné, `took_ms` ; fallback `ILIKE` — **rate limit 60/min (120 admin)** |
| GET     | `/api/search/history`          | historique de l'utilisateur (dédupliqué) |
| DELETE  | `/api/search/history`          | vider son historique |

---

## 7. §4.6 Tableau de bord (P4)

| Méthode | Route                              | Description |
| ------- | ---------------------------------- | ----------- |
| GET     | `/api/dashboard/summary`           | totaux, statuts, départements, stockage, échéances 30 j, compteurs personnels — adapté au rôle |
| GET     | `/api/dashboard/activity?days=30`  | activité récente (audit, périmètre) |
| GET     | `/api/dashboard/expiring?days=30`  | rétention proche (`overdue` si dépassée) |
| GET     | `/api/dashboard/uploads?months=12` | dépôts par mois (zéro rempli) |
| GET     | `/api/dashboard/recent-documents`  | derniers documents visibles |

---

## 8. §4.7 Notifications (P4)

| Méthode | Route                                                              | Accès |
| ------- | ------------------------------------------------------------------ | ----- |
| GET     | `/api/notifications?unread=1&page`                                 | auth  |
| GET     | `/api/notifications/unread-count`                                  | auth  |
| PATCH   | `/api/notifications/<id>/read`, `POST /api/notifications/read-all` | auth  |
| DELETE  | `/api/notifications/<id>`                                          | auth (404 si non propriétaire) |

Types émis : dépôt de document, droit accordé, **`retention_warning`** (préavis J-30, P5).

---

## 9. §4.7 Audit (P5)

### `GET /api/audit` — admin

Journal paginé et filtré, **scoping D6** : super admin = tout (`?campus_id=` optionnel) ;
admin de campus = son campus uniquement (403 `cross_campus_access` sinon) ; un utilisateur simple
ne passe pas (`@admin_required` → 403).

Paramètres : `action`, `object_type`, `user_id`, `from`/`to` (ISO), `page`, `per_page`.

```json
{
  "items": [{
    "audit_id": 42,
    "action": "user_created",
    "object_type": "user_account",
    "object_id": 7,
    "details": {"username": "prof.audit.0"},
    "created_at": "2026-10-01T12:00:00",
    "user": {"user_id": 1, "username": "admin", "full_name": "Admin"}
  }],
  "page": 1, "per_page": 20, "total": 1, "pages": 1
}
```

### `GET /api/audit/export` — admin

CSV (`text/csv`, `Content-Disposition: attachment; filename=audit_export.csv`), mêmes filtres,
plafonné à **10 000 lignes**. Colonnes : `ID, Action, Type objet, ID objet, Utilisateur, Document,
Détails, Horodatage`.

---

## 10. §4.7 Rétention (P5) — super admin

Cycle : préavis **J-30** (`retention_warning`, dédupliqué) → archivage à l'échéance →
purge après `archives.retention_purge_after_days` (fichiers + droits supprimés,
`AuditLog.document_id` détaché). Job quotidien via service compose `scheduler`
(`flask retention run`, intervalle `RETENTION_INTERVAL_SECONDS`, défaut 86 400 s).

### `GET /api/admin/retention/status`

```json
{
  "enabled": true,
  "warning_days": 30,
  "purge_after_days": 365,
  "expiring_soon": 1,
  "expired_active": 1,
  "archived": 0,
  "purgeable": 0,
  "last_report": {"report_id": 1, "ran_at": "…", "dry_run": false,
                   "warnings_sent": 0, "archived": 1, "purged": 0}
}
```

### `POST /api/admin/retention/run`

Corps : `{"dry_run": true}` (optionnel), `{"campus_id": 2}` (super admin). Renvoie le rapport
exécuté (`dry_run`, `warnings_sent`, `archived`, `purged`, `details`). L'exécution est auditée
(`retention_run`). Équivalent CLI : `flask retention run [--dry-run] [--campus-id N]` ;
état : `flask retention status`.

### `GET /api/admin/retention/reports?page=`

Historique paginé des rapports `{items, page, per_page, total, pages}`.

### Réglages associés (`PUT /api/settings`)

| Clé                                  | Type | Défaut | Portée |
| ------------------------------------ | ---- | ------ | ------ |
| `archives.retention_enabled`         | bool | true   | global/campus |
| `archives.retention_warning_days`    | int  | 30     | global/campus |
| `archives.retention_auto_archive`    | bool | true   | global/campus |
| `archives.retention_purge_after_days`| int  | 365    | global/campus |
| `notifications.retention_warning`    | bool | true   | campus |

---

## 11. §4.8 Système

### `GET /health`

Liveness : `{"status": "ok"}`.

### `GET /health/ready` (P5)

Readiness (healthcheck Docker) : vérifie la base (`SELECT 1`) et Redis si `REDIS_URL` est configuré.

- `200 {"status": "ready", "checks": {"database": "ok", "redis": "ok"|"skipped"}}`
- `503 {"status": "degraded", "checks": {"database": "error", ...}}`

### `GET /api/version` (P5)

```json
{"version": "1.0.0", "commit": "unknown", "build_date": null}
```

Alimenté par `APP_VERSION`, `GIT_COMMIT`, `APP_BUILD_DATE`.

### `GET /api/openapi.json` (P6) — public

Spécification **OpenAPI 3.0.3** générée à la volée depuis la carte des routes Flask
(`app/openapi/spec.py`) : chemins, paramètres d'URL, résumés (docstrings des vues), garde réel de
chaque opération (marqueurs `__guards__` des décorateurs), enveloppe d'erreur `Error` et schéma de
sécurité `cookieAuth` (cookie de session). Aucune route ne peut être oubliée : un test impose la
couverture totale.

Annotations non introspectables (déclarées dans `spec.py`, contrôlées par les tests) :
paramètres de query par endpoint, statut `201` des créations, réponses binaires (CSV/téléchargement)
et uploads multipart (`413`/`422`).

### `GET /api/docs` (P6) — public

Console : tableau HTML des opérations (fonctionne **hors ligne**) + Swagger UI chargé depuis unpkg
si le réseau est disponible. CSP dédiée à cette page (`https://unpkg.com` autorisé) ; le reste de
l'application conserve la politique stricte `default-src 'self'`.

---

## 12. Authentification (rappel — P0/P5 préexistant)

Voir [02_architecture_technique.md](02_architecture_technique.md) §5 : `login` → 2FA email →
`verify-2fa` (cookies), `/me`, `/logout`, `/sessions` (liste/révocation), `/session/extend`,
`/forgot-password`, `/reset-password`, `/change-password`, `/2fa/*`, `/security-alerts`.

---

## 13. Journal des migrations

| Révision        | Phase | Contenu |
| --------------- | ----- | ------- |
| `23042faea7a9`  | P0    | baseline create_all (immuable) |
| `e5f0a1b2c3d4`  | P0    | 24 index |
| `f1a2b3c4d5e6`  | P1    | `institution`, `campus`, `setting`, colonnes `campus_id`, backfill |
| `b4c5d6e7f8a9`  | P4    | index composites notification/search_history, `document.search_vector` + trigger + GIN + `pg_trgm` (PostgreSQL) |
| `c5d6e7f8a9b0`  | P5    | table `retention_report` + index `ix_document_status_retention_expires_at`, `ix_retention_report_ran_at` |
