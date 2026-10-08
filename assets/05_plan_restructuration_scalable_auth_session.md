# Plan de restructuration — Scalabilité & Authentification par session HTTPOnly

> Document n°5 — Statut : **VALIDÉ ET IMPLÉMENTÉ**
> Décisions validées : session opaque + Redis (fallback mémoire dev), TTL glissant 7 jours,
> rupture d'API login assumée, CSRF double-submit, rate limiting + Talisman inclus,
> Redux Toolkit supprimé.
> Ajustement demandé par le client : **frontend en architecture par features** (hooks, types,
> store, composants regroupés par domaine) avec **TanStack Query** (state serveur) et
> **Zustand** (state client) — implémenté.

---

## 0. Résumé exécutif

| Axe                 | Situation initiale (avant chantier)                            | Réalisé dans le code                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentification    | JWT access (1 h) + refresh (30 j) en `localStorage`            | **Session opaque** : ID de session aléatoire en cookie **HTTPOnly, Secure, SameSite=Lax**, store serveur Redis (`MemorySessionStore` en fallback), TTL glissant 7 j, révocation immédiate ✅ |
| Backend             | `auth` centralisé, services en vrac, 3 blueprints stubs        | Découpage par domaine (`auth/`, `users/`, `common/`), couche `repositories`, config par variables d'env, application factory élargie ✅ (documents/search/dashboard = stubs enregistrés)     |
| Frontend            | 2 clients HTTP (`fetch`/`axios`), guards CSS, états mockés     | **Un seul client API** (`src/lib/api.js`), interceptors (401/CSRF), TanStack Query pour le state serveur, Zustand pour l'état client, guards `ProtectedRoute`/`RoleGuard` ✅                 |
| Sécurité transverse | Aucun rate limiting, pas de headers, logout sans effet serveur | Flask-Limiter + Talisman, révocation serveur au logout, listing/révocation des sessions ✅                                                                                                   |

---

## 1. Authentification : session opaque HTTPOnly (le cœur de votre demande)

### 1.1 Pourquoi la session opaque plutôt que JWT en cookie

Source : OWASP Session Management Cheat Sheet, Ian London « Please Don't Use JWTs for Browser Sessions », doc officielle Flask-JWT-Extended (qui déconseille elle-même les refresh tokens en cookie).

| Critère                                 | Session opaque (en place ✅) | JWT en localStorage (avant migration) | JWT en cookie HTTPOnly                 |
| --------------------------------------- | ---------------------------- | ------------------------------------- | -------------------------------------- |
| Lecture JS possible (vol XSS)           | Non                          | Oui                                   | Non                                    |
| Révocation immédiate (logout, ban, vol) | ✅ Effacer la clé Redis      | ❌ Attente expiration                 | ❌ Nécessite une blocklist             |
| Échange serveur à chaque requête        | ✅ (get Redis, O(1))         | —                                     | ⚠️ blocklist requise pour être correct |
| Taille requête                          | ~32-43 octets (ID)           | ~1 Ko (JWT)                           | ~1 Ko                                  |
| Complexité                              | Basse                        | Moyenne                               | Moyenne-haute                          |

L'utilisateur demande explicitement « ne stocker que la clé de session » → l'ID de session opaque est exactement cela. JWT en cookie HTTPOnly est une alternative viable (documentée en §7) mais apporte la complexité CSRF + blocklist pour un bénéfice nul ici.

### 1.2 Conception (telle qu'implémentée)

- Cookie `uniarchive_session` : `HttpOnly` (JS ne peut pas le lire), `Secure` (`SESSION_COOKIE_SECURE`, à `false` en local HTTP), `SameSite=Lax` (protection CSRF), `Path=/`
- ID de session : `secrets.token_urlsafe(32)` (~43 caractères)
- **Store serveur** : Redis (`uniarchive:session:{id}` → JSON `{user_id, created_at, last_seen, ip, user_agent, csrf_token}`), TTL glissant 7 jours, clé supprimée = déconnexion
- **Fallback dev** : sans Redis (ou si `client.ping()` échoue), `MemorySessionStore` en mémoire process — pas de table en DB
- TTL glissant : chaque requête authentifiée repousse l'expiration (`get_session(refresh_ttl=True)`), et `POST /session/extend` le fait explicitement
- **CSRF** : double-submit cookie — cookie lisible `uniarchive_csrf` (non-HTTPOnly) + header `X-CSRF-Token` obligatoire sur POST/PUT/PATCH/DELETE
- **Login/2FA inchangé** (username/email + password + code email) ; seuls les mécanismes d'émission de session changent

### 1.3 Changements backend

| Fichier                                      | Action réelle                                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `backend/app/services/session_service.py`    | ✅ **Créé** : `BaseSessionStore`, `RedisSessionStore`, `MemorySessionStore` (fallback), helpers `create_session` / `get_session` / `revoke_session` / `revoke_all_for_user` / `list_user_sessions`              |
| `backend/app/auth/session_auth.py`           | ✅ **Créé** : décorateur `@session_required`, `get_current_user()`, `get_session_id()`, `_validate_csrf` sur les mutations                                                                                      |
| `backend/app/auth/routes.py`                 | ✅ **Modifié** : login/verify-2fa → `_set_session_cookies` ; logout → révocation + effacement cookies ; `GET /me` ; `POST /session/extend` ; `GET                                                               | DELETE /sessions`, `POST /sessions/revoke` |
| `backend/app/auth/decorators.py`             | ✅ **Modifié** : `admin_required`, `role_required`, `department_access_required` s'appuient sur `session_required` (plus de `verify_jwt_in_request`)                                                            |
| `backend/config.py`, `backend/extensions.py` | ✅ **Modifié** : config Redis (`REDIS_URL`), cookies (`SESSION_COOKIE_*`), TTL (`SESSION_TTL_SECONDS`), `limiter` (Flask-Limiter)                                                                               |
| `backend/app/users/routes.py`                | ✅ **Modifié** : `@session_required` (mutations en plus `@admin_required`)                                                                                                                                      |
| `backend/requirements.txt`                   | ✅ **Ajouté** : `redis`, `Flask-Limiter`, `Flask-Talisman`, `gunicorn` — **flask-jwt-extended retiré** (plus aucune occurrence dans le code)                                                                    |
| `backend/tests/test_auth.py`                 | ⚠️ **Non migré** : écrit en `access_token` + header `Authorization` — ce script manuel ne teste plus rien depuis la rupture d'API (à réécrire en `requests.Session()` + cookie/CSRF, ou à remplacer par pytest) |

### 1.4 Changements frontend

| Fichier                                                    | Action réelle                                                                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/api.js`                                  | ✅ **Créé** (et non `src/services/api.js` : le dossier `services/` n'existe plus) : client axios unique, `withCredentials: true`, interceptor 401 → `/login`, interceptor requête → header `X-CSRF-Token` |
| `frontend/src/features/auth/api.js`                        | ✅ **Créé** (remplace `services/authService.js`) : `login`, `verify2FA`, `me`, `logout`, `listSessions`, `revokeAllSessions`, `revokeSession`, `forgotPassword` — aucun `localStorage`                    |
| `frontend/src/features/auth/useAuth.js`                    | ✅ **Créé** : hooks TanStack Query (`GET /auth/me` = source de vérité), mutations login/verify2FA/logout                                                                                                  |
| `frontend/src/features/auth/authStore.js`                  | ✅ **Créé** : store Zustand (`user`, `status`) — l'`AuthContext` prévu n'a pas été créé                                                                                                                   |
| `frontend/src/features/auth/components/ProtectedRoute.jsx` | ✅ **Déplacé** depuis `src/components/` : garde asynchrone sur `useAuth()` (loader pendant `status === 'loading'`, redirection `/login` sinon)                                                            |
| `frontend/src/features/auth/components/RoleGuard.jsx`      | ✅ **Créé** : restriction par rôle (`roles={['Admin']}`) — ⚠️ **jamais utilisé** dans `Routes.jsx` à ce jour                                                                                              |
| `frontend/src/features/users/api.js`                       | ✅ **Créé** (remplace `services/userService.js`) : endpoints users consommant `lib/api.js`                                                                                                                |
| `frontend/src/pages/login/index.jsx`                       | ✅ **Modifié** : plus de gestion de tokens ; `useAuth().login` / `verify2FA`, cookies posés par le backend                                                                                                |
| `frontend/src/pages/dashboard/index.jsx`                   | ✅ **Modifié** : utilisateur depuis `useAuth()` (`GET /auth/me`) + mapping `mapBackendRole`                                                                                                               |
| `frontend/src/app/providers.jsx`                           | ✅ **Créé** : `QueryClientProvider` global (+ `app/queryClient.js`)                                                                                                                                       |
| `.env.example` (racine, backend, frontend)                 | ✅ **Créé** : `VITE_API_URL` (défaut `/api`), `SESSION_COOKIE_*`, `REDIS_URL`, `FORCE_HTTPS`… plus aucune référence token/localStorage                                                                    |

### 1.5 Sécurité renforcée livrée avec la migration

- **Logout réel** : suppression de la session serveur → morte instantanément (vs ancien JWT valable jusqu'à 1 h après logout)
- **« Déconnexion partout »** : `DELETE /api/auth/sessions` (révoque toutes les sessions de l'utilisateur)
- **Listing des sessions actives** : `GET /api/auth/sessions` (IP, dernière activité — l'`session_id` est tronqué à 8 caractères, le `csrf_token` n'est jamais exposé) → interface « Mes appareils » future
- Session fraîche à chaque connexion : la session n'est créée qu'à `verify-2fa` (aucune session préexistante n'est réutilisée)
- Rate limiting par IP via `@limiter.limit(...)` (Flask-Limiter) : login 5/min, verify-2FA 10/min, forgot/reset-password 5/min, global 200/min

### 1.6 Migration / compat

- **Rupture d'API volontaire** : `/api/auth/login` ne renvoie plus de tokens — le frontend a été adapté dans la même itération
- Anciens tokens localStorage : simplement ignorés (plus de code pour les lire)
- Pas de migration de données : les sessions vivent dans Redis/mémoire, éphémères

## 2. Restructuration backend pour la scalabilité

### 2.1 Organisation réelle (implémentée)

```
backend/
├── config.py            # Dev / Prod / Testing (env-driven)     ← à la racine de backend/
├── extensions.py        # db, migrate, bcrypt, cors, mail, limiter (pas de jwt)
├── wsgi.py              # point d'entrée gunicorn / app.run
└── app/
    ├── __init__.py      # create_app() : config, extensions, Talisman, ProxyFix,
    │                    #   limiter, session store, error handlers, blueprints, /health
    ├── routes.py        # blueprint `main` — défini mais non enregistré
    ├── common/          # partagé
    │   ├── errors.py    # AppError, ValidationError, NotFoundError, PermissionDeniedError…
    │   ├── responses.py # ok(), error_response(), paginated()
    │   └── decorators.py# @transactional (pas de rate_limit ici : decorators sont dans Flask-Limiter)
    ├── auth/            # domaine Auth
    │   ├── routes.py        # endpoints HTTP (login, 2fa, sessions, password…)
    │   ├── session_auth.py  # @session_required + CSRF
    │   ├── decorators.py    # admin_required, role_required, department_access_required
    │   ├── services.py      # AuthService (ex-`auth_service.py`)
    │   ├── error_handlers.py# 401/403/404/429/500 JSON
    │   └── __init__.py
    ├── users/
    │   ├── routes.py        # blueprint /api/users
    │   ├── services.py      # UserService (ex-`user_service.py`)
    │   ├── repositories.py  # UserRepository
    │   └── __init__.py
    ├── documents/       # ⚠️ STUB (routes.py seul, enregistré sous /api/documents)
    ├── dashboard/       # ⚠️ STUB (routes.py seul)
    ├── search/          # ⚠️ STUB (routes.py seul)
    ├── models/          # 19 fichiers modèles SQLAlchemy (18 classes + document_tag)
    └── services/        # transverses : session_service, email_service, permission_service (vide)
```

> Écarts par rapport à la cible initiale : `auth/errors.py`, `documents/{services,repositories,schemas}.py`
> et `extensions.py`/`config.py` sous `app/` **n'ont pas été créés** — `config.py` et `extensions.py`
> vivent à la racine `backend/` (imports `from config import config`, `from extensions import db`).

### 2.2 Principes appliqués

- **Routes minces** : parse → service → réponse (respecté sur `auth` et `users` ; stubs documents/dashboard/search)
- **Services par domaine** : la logique vit dans `auth/services.py`, `users/services.py` ✅
- **Repositories** : `users/repositories.py` regroupe les requêtes SQLAlchemy réutilisables ✅
- **Exceptions métier centralisées** : `common/errors.py` existe, mais les routes retournent encore des `jsonify({'error': ...})` en clair — **à migrer progressivement**
- **Config 100 % env-driven** : refus explicite en prod sans `SECRET_KEY`/`DATABASE_URL` ✅ (fallback dev conservé pour le local)
- **Prêt pour la suite** : documents/search/dashboard suivront ce squelette en phase 1

### 2.3 Hors périmètre (à confirmer)

- **Migration Redis managé** : à choisir au déploiement — le code accepte `REDIS_URL` (fallback mémoire sinon)
- OCR, upload de fichiers, multi-tenant : **non inclus** dans cette restructuration
- ✅ Suppression totale de flask-jwt-extended : **faite** (plus aucune occurrence, dépendance retirée de `requirements.txt`)

## 3. Restructuration frontend pour la scalabilité

### 3.1 Organisation réelle (implémentée)

```
frontend/src/
├── main.jsx             # createRoot → <Providers><App/>
├── App.jsx → Routes.jsx # BrowserRouter, /login + 5 routes protégées + 404
├── lib/
│   └── api.js           # instance axios unique (withCredentials, interceptors CSRF/401)
├── app/
│   ├── queryClient.js   # QueryClient TanStack Query global
│   └── providers.jsx    # QueryClientProvider
├── features/            # ARCHITECTURE PAR FEATURES
│   ├── auth/
│   │   ├── api.js       # endpoints auth (login, verify2fa, me, logout, sessions, forgot-password)
│   │   ├── authStore.js # store Zustand (user, status)
│   │   ├── useAuth.js   # hooks : useAuth, useSessions, useRevokeAllSessions
│   │   ├── types.js     # types JSDoc (User, Role, SessionInfo…)
│   │   ├── index.js     # barrel export
│   │   └── components/
│   │       ├── ProtectedRoute.jsx  # garde asynchrone (session)
│   │       └── RoleGuard.jsx       # restriction par rôle — ⚠️ jamais utilisé
│   └── users/
│       ├── api.js       # endpoints users
│       ├── useUsers.js  # hooks TanStack Query (useUsers, useCreateUser, …)
│       ├── types.js     # types JSDoc
│       └── index.js     # barrel export
├── components/          # ErrorBoundary, ScrollToTop, AppIcon, AppImage + ui/
├── pages/               # écrans (login, dashboard, user-management branchés ;
│                        # document-library/upload/search encore sur mocks — phase 1)
└── styles/ utils/
```

> **Note d'implémentation** : l'AuthContext prévu initialement a été remplacé par un store
> Zustand (`features/auth/authStore.js`) conformément à la demande du client, et les hooks
> TanStack Query gèrent tout le state serveur (users, rôles, départements).

### 3.2 Changements structurants

1. ✅ **Un seul client HTTP** (`src/lib/api.js`) — fin de la dualité fetch/axios
2. ✅ **État d'auth central** : store Zustand + query `GET /auth/me` (plus de lectures localStorage dispersées)
3. ✅ **ProtectedRoute asynchrone** : interroge `/api/auth/me` au premier chargement, affiche un loader pendant la vérification
4. ⚠️ **RoleGuard** : implémenté mais **non branché** dans `Routes.jsx` — tout utilisateur authentifié ouvre encore `/user-management` (l'API bloque les mutations via `@admin_required`)
5. ✅ **Redux Toolkit supprimé** des dépendances (remplacé par Zustand + TanStack Query)

### 3.3 Hors périmètre de ce plan

- Migration des écrans document/library/upload/search vers l'API : phase 1 (voir [04_analyse_recommandations.md](04_analyse_recommandations.md))

## 4. Sécurité transverse incluse

| Élément          | Implémentation réelle                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiting    | Flask-Limiter (`memory://` ou `REDIS_URL`/`RATELIMIT_STORAGE_URI`) : login 5/min, verify-2FA 10/min, forgot/reset-password 5/min, global **200/min** |
| Headers sécurité | Flask-Talisman (CSP stricte, nosniff, frame-deny, HSTS si `FORCE_HTTPS=true`) ; `ProxyFix` si `BEHIND_PROXY=true`                                    |
| CSRF             | Double-submit cookie `uniarchive_csrf` + header `X-CSRF-Token` vérifié par `session_auth._validate_csrf` sur POST/PUT/PATCH/DELETE                   |
| Cookies          | `HttpOnly`, `Secure` (`SESSION_COOKIE_SECURE`), `SameSite=Lax`, `Path=/`, TTL `SESSION_TTL_SECONDS` (7 j)                                            |
| Révocation       | `revoke_session()` / `revoke_all_for_user()` — scan des sessions de l'utilisateur (pas de set dédié : `list_for_user` parcourt les clés)             |
| Logs             | Aucun contenu de cookie/token loggé ; audit des connexions conservé (`AuditLog`)                                                                     |

## 5. Plan d'exécution (phases) — ✅ TOUTES RÉALISÉES

### Phase A — Backend session ✅

1. Config + extensions Redis/Limiter/Talisman + `.env.example` (racine, `backend/`, `frontend/`)
2. `app/services/session_service.py` (stores Redis + Memory fallback)
3. `app/auth/session_auth.py` (`session_required`, CSRF)
4. Adaptation `app/auth/routes.py` (login, verify-2fa, logout, me, sessions, session/extend)
5. Adaptation `app/auth/decorators.py` + `app/users/routes.py`
6. Smoke tests manuels (cookie jar)

### Phase B — Frontend session ✅

1. `src/lib/api.js` (interceptors CSRF/401) — chemin final, l'idée `services/api.js` a été abandonnée au profit de `lib/`
2. Store Zustand `features/auth/authStore.js` + `ProtectedRoute` async + `RoleGuard` (ce dernier **non branché** dans `Routes.jsx`)
3. `services/authService.js` → `features/auth/api.js` + `features/auth/useAuth.js`
4. `services/userService.js` → `features/users/api.js` + `features/users/useUsers.js`
5. Adaptation login/2FA/dashboard/user-management
6. Validation parcours complet (login → 2FA → dashboard → users → logout)

### Phase C — Backend structure ✅

1. `app/common/` (errors, responses, decorators)
2. Services par domaine (`auth/services.py`, `users/services.py`)
3. `users/repositories.py` (requêtes extraites du service)
4. Blueprints stubs enregistrés (documents/dashboard/search)

### Phase D — Sécurité transverse ✅

1. Flask-Limiter + Talisman + ProxyFix
2. Documentation mise à jour (docs 02/03/04/06)

### Phase E — Nettoyage ✅

1. flask-jwt-extended retiré de `requirements.txt` (plus aucune occurrence)
2. Redux Toolkit retiré de `package.json` (remplacé par Zustand + TanStack Query)
3. `.env.example` des deux côtés + racine finalisés

> Reste ouvert (hors périmètre de ce plan) : **pytest + CI**, migration de `backend/tests/test_auth.py`
> (toujours écrit en JWT), branchement de `RoleGuard`, API documents.

## 6. Risques & mitigations

| Risque                                          | Impact                        | Mitigation                                                                                                                       |
| ----------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2FA par email SMTP non configuré                | Personne ne peut se connecter | Mode dev `email_service.py` : le code 2FA est `print()` dans `docker compose logs backend` (aucune désactivation possible)       |
| CSRF mal configuré → blocage des mutations      | Écrans cassés                 | Double-submit testé sur chaque mutation ; cookie CSRF posé au login ; interceptor automatique côté front                         |
| Redis indisponible                              | Login impossible              | Fallback automatique sur `MemorySessionStore` avec warning logs                                                                  |
| Sessions perdues au redémarrage (MemoryStore)   | Déconnexions                  | Acceptable en dev ; prod = Redis managé                                                                                          |
| Régression sur les écrans non migrés            | UX dégradée                   | Les écrans document/search/dashboard restent sur leurs mocks (inchangés) ; seuls auth + users + dashboard switchent à la session |
| Rupture API login                               | Ancien frontend incompatible  | Migration frontend dans la même itération (Phase B juste après A)                                                                |
| Frontend déployé sur un autre domaine que l'API | Cookies bloqués               | En prod : même domaine (reverse proxy `/api`) ou `SameSite=None; Secure` + CORS avec domaine exact                               |

## 7. Alternative JWT-en-cookie (si vous préférez garder des JWT)

Si vous souhaitez conserver des JWT : `JWT_TOKEN_LOCATION=["cookies"]`, `JWT_COOKIE_SECURE`, `JWT_COOKIE_SAMESITE=Lax`, `JWT_COOKIE_CSRF_PROTECT=True` (double-submit `X-CSRF-TOKEN`), et blocklist Redis pour la révocation. **Mais** : révocation = blocklist à maintenir, tokens plus gros, complexité CSRF identique, et le résultat final équivaut à une session. Le plan principal (session opaque) est recommandé.

## 8. Critères de validation du plan (definition of done) — ✅ TOUS ATTEINTS

**Vérifications effectuées :** backend `create_app()` OK (31 routes, testing + développement),
smoke tests session 7/7 (cookie HTTPOnly, CSRF 403 sans token, révocation logout effective),
frontend lint + build OK. `tailwindcss-elevation` (incompatible Tailwind 4, inutilisée) retirée.

- [x] Login + 2FA posent un cookie HTTPOnly ; plus aucun token dans localStorage
- [x] Logout tue la session côté serveur immédiatement
- [x] Un seul client HTTP côté frontend (`lib/api.js`)
- [x] Guard d'auth asynchrone fonctionnel (`ProtectedRoute`)
- [x] Rate limiting actif sur login (5/min) et 2FA (10/min)
- [x] user-management branché sur l'API réelle (CRUD via TanStack Query)
- [x] Lint + build frontend OK ; `create_app()` OK et toutes les routes mappées
- [x] Documentation mise à jour

**Écarts connus / reste à faire (hors critères du plan) :**

- [ ] `RoleGuard` branché dans `Routes.jsx` sur `/user-management` (le composant existe, il n'est jamais monté)
- [ ] `backend/tests/test_auth.py` réécrit en sessions (`requests.Session` + cookie/CSRF) ou remplacé par pytest
- [ ] Écrans document/library/upload/search migrés vers l'API (phase 1)

## 9. Décisions prises

1. **Session opaque + Redis (fallback mémoire en dev)** — vs JWT en cookie HTTPOnly (§7) : **retenue et implémentée**
2. **TTL glissant 7 jours** (`SESSION_TTL_SECONDS=604800`) : **retenue**
3. **Rupture d'API login** (plus de tokens dans la réponse) : **retenue** (frontend migré dans la même itération)
4. **Rate limiting + Talisman inclus** : **retenus** (Flask-Limiter 5/10/5/min + global 200/min, Talisman avec CSP)
5. **Redux Toolkit** : **supprimé** (remplacé par Zustand + TanStack Query)
6. **React Query** : **inclus** (`app/queryClient.js` + `app/providers.jsx`)
7. **CSRF double-submit** (cookie lisible `uniarchive_csrf` + header `X-CSRF-Token`) : **retenue**

---

> Ce document est conservé comme trace du chantier : il décrit les décisions prises et ce qui a
> réellement été implémenté dans le code (écarts signalés en clair). L'état courant du projet est
> décrit dans [03_etat_avancement.md](03_etat_avancement.md) et le plan de suite dans
> [04_analyse_recommandations.md](04_analyse_recommandations.md).
