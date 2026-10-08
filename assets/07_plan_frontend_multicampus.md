# 07 — Plan frontend multi-campus (UniArchive Web)

> **Objet** : passer l'application React d'un **prototype sur données mock** à une **interface
> d'administration d'archives multi-campus complète**, branchée sur le backend livré (P0→P6), avec
> une architecture **par domaine**, un **état serveur centralisé**, un **contrat API vérifié** et
> une **qualité outillée** (tests, lint, budget de bundle).
>
> **Statut** : ✅ **RÉDIGÉ le 02/10/2026** — **4 décisions arbitrées** ce jour (Q1, Q4, Q6, Q7) ;
> Q2/Q3/Q5/Q8/Q9/Q10 restent ouvertes ⭐ avant le démarrage de F0.
> **Avancement** : **constat initial** — socle session + gestion des utilisateurs branchés sur
> l'API, 4 écrans encore sur données mock — détail §1.
> **Versionnage** : dépôt `frontend/` — base **`test`** (seule branche de base du dépôt, suivant
> `origin/test` ; aucune branche `master` n'existe côté `frontend/`) + **une branche par phase**
> (`f3-bibliotheque-structure`, `f4-depot-versions`, …), merge `--no-ff` à la fin de chaque phase.
> **F6 fusionnée** le 05/10/2026 : `f6-administration` → `test` en `--no-ff` (merge commit
> `291417d`) ; ce merge intègre F3→F6 (branches linéaires, jamais fusionnées séparément).
> Ce document vit dans le dépôt racine (branche `main`), à côté de son jumeau
> [`07_plan_backend_multicampus.md`](07_plan_backend_multicampus.md).
> **Périmètre** : **frontend uniquement**. Le backend est **gelé** : toute fonctionnalité qui lui
> manque est une **nouvelle ligne du plan backend (règle R6)**, jamais un ajout implicite dans ce
> document. Le contrat fait foi : [`08_api_reference.md`](08_api_reference.md) +
> `GET /api/openapi.json` (**114 opérations / 82 chemins**, générées depuis le code réel).

---

## 0. Ce que ce plan ne fait pas

| Exclu du périmètre                          | Raison                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Nouvel endpoint ou évolution du backend     | Backend gelé (P0→P6 livré) ; besoin constaté = **ligne R6** dans le plan 07 |
| Multi-tenant, thème par établissement       | Décision D1 du backend : **non voulu**                                      |
| Refonte graphique / nouveau design system   | Le socle Tailwind + `components/ui` existant est **conservé** et étendu     |
| Migration TypeScript en Big Bang            | **Q1 tranché : progressif**, par domaine — pas de réécriture en un tenant   |
| Application mobile native / PWA hors-ligne  | Non planifié : la cible est le web responsive                               |
| Refonte du routing en data-router + loaders | Non nécessaire : l'actuel `BrowserRouter` + gardes suffit en F0             |

---

## 1. Position de départ (constat vérifié sur le code)

> Tout ce qui suit a été **vérifié le 02/10/2026** dans `frontend/` (dépôt git séparé, 2 commits :
> `2901043` initial, `31706f4` « client API session/CSRF, écran 2FA, Docker + Nginx »).
> Aucun travail n'a été entamé depuis.

### 1.1 Ce qui existe et fonctionne ✅

| Bloc                              | Détail vérifié                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stack posée**                   | React **19** · Vite **7** · React Router **7** · TanStack Query **5** · Zustand **5** · axios · Tailwind **4** · react-hook-form · recharts · d3 · framer-motion · lucide-react (dépendances déjà installées)       |
| **Client HTTP unique**            | `src/lib/api.js` : `withCredentials` (cookies), header `X-CSRF-Token` sur les mutations (double-submit), redirection `401` → `/login`                                                                               |
| **Session**                       | `GET /auth/me` au premier montage, store Zustand (`authStore`), `ProtectedRoute` avec loader, logout **serveur** depuis le Header (`POST /auth/logout` + purge du cache Query)                                      |
| **Parcours login complet**        | `login` → **2FA** (`verify-2fa`) → redirection, `forgot-password`, garde de session sur `/`, 404, `ErrorBoundary` racine                                                                                            |
| **State management**              | TanStack Query global (staleTime 30 s, **retry désactivé sur 401/403/404**, pas de refetch au focus) + Zustand pour l'état client — règle déjà posée et documentée dans les fichiers                                |
| **2 features découpées**          | `features/auth` et `features/users` : `api.js` (endpoints) + `use*.js` (hooks) + `types.js` (JSDoc) + `index.js` (surface exportée) — le **patron** à généraliser                                                   |
| **Écrans**                        | `login`, `dashboard`, `user-management`, `document-library`, `document-upload`, `advanced-search` + ~35 composants UI (Button, Input, Select, Checkbox, Breadcrumb, Header, DocumentActionToolbar, Table, modales…) |
| **Gestion utilisateurs (réelle)** | liste paginée, création, mise à jour, activation/désactivation, réinitialisation de mot de passe, import CSV, export CSV, rôles + départements (8 des 11 endpoints de ce domaine)                                   |
| **Livraison**                     | `Dockerfile` 2 étapes (build Vite → Nginx), proxy `/api` **même origine** (aucun port API exposé, aucun CORS), `client_max_body_size 50m`, headers de sécurité de base, cache 30 j des assets fingerprintés         |
| **Qualité outillée (partielle)**  | ESLint 9 (flat config) + Prettier-ready, **`npm run build` vert** en 12 s                                                                                                                                           |

### 1.2 Ce qui manque ou est faux ❌

| #   | Constat vérifié                                                                                                                                                                                                                  | Preuve (fichier)                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | **4 écrans sont entièrement sur données mock** : bibliothèque, dépôt, recherche avancée, tableau de bord                                                                                                                         | `pages/document-library/index.jsx:34` (`mockDocuments`), `document-upload/index.jsx:33`, `advanced-search/index.jsx:45`, `dashboard/components/NotificationCenter.jsx:8` |
| M2  | **13 des 114 opérations de l'API sont réellement appelées (≈ 11 %)** : `documents`, `search`, `dashboard`, `notifications`, `audit`, `retention`, `settings`, `campuses`, `permissions`, `folders`, `referentiels` → **0 appel** | `grep api\.(get\|post\|…) src/`                                                                                                                                          |
| M3  | **Zéro test** : `@testing-library/react` + `user-event` sont installés mais **aucun fichier de test**, aucun runner (Vitest absent du `package.json`)                                                                            | `find src -name "*.test.*"` → vide                                                                                                                                       |
| M4  | **`npm run lint` est rouge : 25 problèmes (24 erreurs)** — variables mortes, optional chaining non sûr, échappements inutiles, deps `useEffect` manquantes                                                                       | `npx eslint .`                                                                                                                                                           |
| M5  | **Un seul bundle : 1 391 ko (311 ko gzip)**, avertissement explicite de Vite « chunks > 500 kB », aucun `React.lazy` ni `manualChunks`                                                                                           | `dist/assets/index-*.js`, `Routes.jsx` (imports statiques)                                                                                                               |
| M6  | **`RoleGuard` importé jamais utilisé** : aucun écran n'est réservé à un rôle — un étudiant ouvre `/user-management` et obtient la liste des comptes (`GET /users` n'exige que la session)                                        | `features/auth/components/ProtectedRoute.jsx:8`, `Routes.jsx`                                                                                                            |
| M7  | **Zéro notion de campus** (0 occurrence de `campus` dans `src/`) alors que l'API l'impose partout : `?campus_id=`, `403 cross_campus_access`, super admin = `Admin` sans campus                                                  | `grep -ri campus src/` → 1 résultat marketing                                                                                                                            |
| M8  | **13 `alert()` / `window.confirm()`** (feedback brut), **28 `window.location`** (navigation pleine page au lieu de `navigate()`), **1 seul `document.title`**                                                                    | `grep -rn "alert(" src/`, etc.                                                                                                                                           |
| M9  | **Utilisateur fictif codé en dur** dans 3 écrans (`« Marie Dubois »`, `« Ibrahim »`) au lieu de `useAuth()` ; **notifications du Header factices**                                                                               | `document-library/index.jsx:17`, `document-upload/index.jsx:16`, `Header.jsx:47`                                                                                         |
| M10 | **Création de compte sans mot de passe** (le backend applique alors son défaut) et **message faux** « Un email a été envoyé » alors que la réponse `temporary_password` de l'API est ignorée                                     | `user-management/index.jsx:238-279`                                                                                                                                      |
| M11 | **Formulaire utilisateur incomplet** : ni matricule saisi (généré `USR<timestamp>` côté client), ni **campus**, ni mot de passe — contrairement à la règle backend Q2 (`campus_id` obligatoire)                                  | `UserModal.jsx`, `user-management/index.jsx:238`                                                                                                                         |
| M12 | **Actions groupées = `alert()`** « nécessite un endpoint backend dédié » (inexistant : il n'y a que `POST /api/documents/bulk`) ; **pagination serveur non exploitée** (`page` figée à 1, `perPage=100`, filtres locaux)         | `user-management/index.jsx:292`, `:29`                                                                                                                                   |
| M13 | **Cohérence visuelle rompue** : ~33 classes de couleur hardcodées (`bg-blue-500`, `bg-green-500`…) en parallèle des tokens (`bg-primary`, `bg-card`) ; `mapBackendRole` dupliqué dans 2 pages                                    | `grep -c bg-blue-500 src/pages`                                                                                                                                          |
| M14 | **i18n absente** : `LanguageSelector` écrit dans `localStorage` et n'a aucun effet ; `index.html` déclare `lang="en"`                                                                                                            | `LanguageSelector.jsx`, `index.html`                                                                                                                                     |
| M15 | **README faux** (parle de Redux Toolkit / React 18 / `npm start`) et **aucune CI** : pas de `.github/` dans `frontend/`                                                                                                          | `frontend/README.md`                                                                                                                                                     |

### 1.3 Dette identifiée (corrigeable proprement)

- `useState` **× 111** dans `pages/` : des données serveur sont recopiées en local (source de
  désynchronisation dès qu'une mutation est faite ailleurs).
- Métadonnées d'utilisateur **dupliquées** (état local par page) alors que `useAuth()` existe.
- Aucun composant de retour d'erreur standard : chaque page reconstruit ses propres messages.
- Composants UI **non testés ni documentés** (pas de catalogue) → risque de divergence F3/F6.
- `exportUrl` ouvert via `window.open` sans `noopener`, sans traitement des `403/429`.
- `save`/`restore` des filtres non persistés : tout est perdu au changement de page.

---

## 2. Décisions d'architecture (à valider ⭐)

> Chaque décision est implémentée **dès la phase qui la rend utile**. Les réponses de l'utilisateur
> sont attendues sur le tableau **§11** avant le démarrage de F0.

### A1 — Architecture **par domaine** (feature-sliced), dépendances en un seul sens

```
pages/  →  features/  →  lib/     (jamais l'inverse)
pages/  →  components/            (composants sans logétique métier)
```

- **`lib/`** : le minimum transverse — `api.js` (client HTTP), `errors.js` (codes → messages),
  `queryKeys.js`, `formatters.js`, `i18n/`, `cn.js`. **Aucune** dépendance à `features/`.
- **`features/<domain>/`** : le contrat d'un domaine métier — `api.js` (endpoints),
  `use*.js` (hooks TanStack Query + mutations), `components/`, `types.js` (JSDoc), `index.js`
  (**seule porte de sortie** du domaine).
- **`pages/`** : composition d'écran (route + layout + appels de hooks). **Une page ne parle
  jamais axios** — c'est déjà vrai pour `auth`/`users`, à généraliser sans exception.
- **`components/ui/`** : primitives sans connaissance du domaine (Button, Table, Dialog, Toast,
  Badge, Pagination, EmptyState, Skeleton, FileDropzone).
- **Règle de dépendance vérifiable en lint** (ESLint `no-restricted-imports`) : `features/*` n'importe
  jamais `pages/*`, `lib/*` n'importe jamais `features/*`.

**Pourquoi** : c'est la seule structure qui survit à l'ajout d'un domaine (rétention, audit,
permissions…) sans devenir une boule de `useState`.

### A2 — État serveur = TanStack Query, état client = Zustand

- **Toute donnée serveur passe par Query** : `useQuery` + `useMutation`, **clés centralisées par
  domaine** (`usersKeys.list({page, filters})`) et invalidation ciblée (`invalidateQueries` sur la
  liste concernée, jamais `queryClient.clear()` sauf logout).
- **Zustand** pour le client : session (existant), **périmètre campus**, préférences (langue, filtres
  persistés, densité de table).
- **Interdiction** de recopier une réponse serveur dans un `useState` de page (la règle
  `placeholderData: (prev) => prev` de `useUsers` est le bon motif : garder la page précédente le
  temps du refetch, sans copie).

### A3 — Contrat API : OpenAPI → types générés, jamais de payload écrit à la main

- Le backend expose `GET /api/openapi.json` (**114 opérations**, garde réelle de chaque route).
  **Génération** : `npm run codegen` (`openapi-typescript` en devDependency) →
  `src/lib/schema/api.d.ts`, **regénérée en CI** (diff = échec de build).
- Les `types.js` JSDoc actuels deviennent des alias des types générés (`@typedef
{import('../lib/schema/api').components['schemas']['User']} User`) : plus aucune définition
  manuelle qui dérive.
- **TypeScript progressif (Q1 tranché)** : `tsconfig.json` avec `allowJs: true` et
  `checkJs: true` transitoire, **tous les fichiers nouveaux en `.ts`/`.tsx`**, migration des
  domaines existants un par un (`features/auth` en premier). `tsc --noEmit` est **bloquant en CI**
  dès F0 : les `.js` non migrés ne font l'objet que d'avertissements, les `.ts` de zéro tolérance.
  Les types générés deviennent la **source** (`.d.ts`) : plus aucune double définition.
- **Validation runtime légère** sur les réponses de liste/détail (Q2) : soit `zod` en frontière
  (`features/*/api.js`), soit MSW + tests de contrat. Objectif : une réponse modifiée casse **un
  test**, pas un écran en production.

### A4 — Multi-campus : le **serveur scope**, l'UI reflète (et n'invente jamais)

- Le filtrage `apply_campus_scope()` est appliqué côté serveur (décision Q3 backend) : **le frontend
  ne filtre jamais par campus lui-même**. On affiche ce que l'API renvoie.
- `useScopeStore` : `campusId` (`null` = « tous les campus », réservé au **super admin**).
  Envoyé en `?campus_id=` **uniquement** sur les endpoints qui l'acceptent.
- **Sélecteur de campus dans le Header**, visible uniquement si `user.campus_id === null &&
user.role?.name === 'Admin'` (définition serveur du super admin).
- Chaque écran affiche un **bandeau de périmètre** (`« Campus : PRINCIPAL »`), pour qu'un 403
  `cross_campus_access` ne soit jamais un blanc.
- Les boutons d'écriture sont masqués selon le rôle **et** selon `permissions/check` quand
  l'écran le demande ; le backend reste la seule autorité (un garde UI n'est qu'un confort).

### A5 — Erreurs : une seule couche, des codes, pas des `alert()`

- `lib/errors.js` traduit l'enveloppe `{error, code, details}` en **message FR + action** :
  `validation_error` → champ fautif · `forbidden` / `cross_campus_access` / `no_campus_scope` →
  bandeau de périmètre · `conflict` → message inline · `payload_too_large` → « 50 Mo maximum » ·
  `unprocessable` → refus d'extension/signature · `rate_limited` → délai avant nouvelle tentative ·
  `unauthorized` → redirection (déjà faite dans l'intercepteur).
- **Toasts** pour l'information, **message inline** pour la validation de formulaire,
  **`ErrorBoundary` par route** pour l'échec réseau/d'un chunk lazy (avec bouton « réessayer »).
- **Fin des 13 `alert()` / `confirm()`** : remplacés par `Toast` + `Dialog` de confirmation.

### A6 — Sécurité côté client

- Cookies **HTTPOnly** pour la session (jamais de token en `localStorage`) ; CSRF en double submit
  (**déjà fait**) ; aucun secret dans le bundle (`VITE_*` = configuration publique uniquement).
- **Rendu sûr des contenus riches** : l'API renvoie des extraits de recherche avec `<mark>` et des
  `details` d'audit arbitraires → **`dangerouslySetInnerHTML` interdit** par règle ESLint ; parsing
  avec `DOMParser` + liste blanche (`mark`) dans un helper dédié.
- Liens externes/exports : `rel="noopener"` systématique, `target` contrôlé.
- En-têtes Nginx alignés sur la CSP backend (`default-src 'self'`), `frame-ancestors 'none'`.
- Les tests E2E utilisent des comptes de jeu de test (`flask seed demo`), **jamais** `admin`.

### A7 — Routage : lazy par route, gardes déclaratives, un rôle par écran

- **Chargement paresseux** de chaque route (`React.lazy` + `Suspense`) → budget de bundle (A10) ;
  échec de chunk = fallback + retry.
- Garde par couche : `RequireAuth` (session) → `RequireRole roles={[…]}` (le `RoleGuard` existant,
  **enfin branché**) → `RequireScope` (écrans super admin : campus, réglages, rétention).
- Les gardes **masquent** l'entrée de menu ; le backend **refuse** l'API. Les deux sont nécessaires,
  le second fait foi.
- `document.title` + fil d'Ariane par route (le `Breadcrumb` existe, il doit se router), pages
  **403** et **404** dédiées.

### A8 — Branding, réglages et i18n pilotés par l'API

- **`GET /api/settings/public`** (public) fournit logo, langue, extensions autorisées, taille
  maximale, niveaux de confidentialité → **plus aucune constante hardcodée** (`50 * 1024 * 1024`,
  `.pdf, .doc…` dans `document-upload`) et le branding de `login` suit l'institution.
- i18n : **FR par défaut**, dictionnaire plat `lib/i18n/fr.js|en.js` (Q3), langue initiale depuis
  `settings/public`, `document.documentElement.lang` mis à jour.
- Les chaînes d'interface **ne sont plus écrites en dur** dans les composants à partir de F0 pour
  les nouveaux écrans (rétrofit progressif, pas de Big Bang).

### A9 — Fini les données factices

- Les données de démo ne vivent que **(a)** dans les fixtures **MSW** de test et **(b)** dans
  `flask seed demo` côté serveur. **Aucun tableau de données factice dans `src/pages/`**.
- Chaque écran gère **4 états** : chargement (`Skeleton`) · vide (`EmptyState` + action) · erreur
  (A5) · données.

### A10 — Performance : budget de bundle, splits, listes fluides

- **Budget : ≤ 200 ko gzip** de JS au premier chargement (constat actuel : **311 ko**), enforcement
  en CI via `size-limit` (ou `vite-bundle-visualizer` + seuil manuel en F0).
- Découpage par route + `manualChunks` pour les vendors lourds (`recharts`, `d3`) **chargés
  uniquement** sur le tableau de bord qui les utilise.
- Listes : `placeholderData` sur le changement de page, **debounce 300 ms** sur les filtres et la
  recherche, pagination serveur (offset) + mode clé pour les très gros volumes
  (`pagination=keyset`, disponible côté backend).
- Images : `loading="lazy"` via `AppImage`, assets fingerprintés (déjà en cache 30 j).

### A11 — Tests : le backend est déjà à 82 %, le frontend est à 0

| Niveau          | Outil                                               | Cible                                            |
| --------------- | --------------------------------------------------- | ------------------------------------------------ |
| Unitaire        | **Vitest** (`renderHook`, utilitaires `lib/`)       | hooks, formatters, mapping d'erreurs             |
| Composant       | **Vitest + React Testing Library + user-event**     | primitives `components/ui`, modales, formulaires |
| Contrat         | **MSW** (handlers générés depuis OpenAPI)           | aucune dérive de payload silencieuse             |
| E2E             | **Playwright** contre `docker compose up --build`   | parcours : login 2FA → dépôt → recherche → admin |
| Non-fonctionnel | **ESLint (0 erreur) + size-limit + `tsc --noEmit`** | bloquant en CI                                   |

- **Couverture cible ≥ 70 % sur les domaines (`features/*`)**, sans obligation sur les pages pures.
- **CI frontend** (`.github/workflows/ci.yml` dans `frontend/`) : `npm ci` → `lint` → `test` →
  `build` → `size-limit`. Aujourd'hui : **aucune CI** (le backend, lui, en a une).

### A12 — Design system : étendre, ne pas réinventer

- Les primitives existantes sont la **seule source** de style : ajouter `Table`, `Dialog`, `Toast`,
  `Badge`, `Pagination`, `Skeleton`, `EmptyState`, `FileDropzone`, `ConfirmDialog`.
- **Tokens uniquement** (`styles/index.css` : `bg-primary`, `text-foreground`, `border-border`) →
  interdiction des classes de couleur Tailwind hardcodées (33 actuelles) — règle ESLint
  `no-restricted-syntax` sur `bg-(blue|green|red|purple|yellow)-[0-9]+`.
- Les erreurs et le mapping de rôle (`mapBackendRole`, dupliqué) vivent en `lib/`, une seule fois.

---

## 3. Cible : arborescence et conventions

```
frontend/src/
├── main.jsx                  # StrictMode + Providers
├── app/
│   ├── providers.jsx          # QueryClientProvider, ThemeProvider, ToastProvider, i18n
│   ├── queryClient.js         # politique de retry/stale (existant)
│   ├── router.jsx             # routes lazy + gardes (RequireAuth/Role/Scope)
│   └── ErrorBoundary.jsx      # par route
├── lib/
│   ├── api.js                 # client axios : cookies, CSRF, 401, upload progress      (existant)
│   ├── errors.js              # {error, code, details} → message FR + action           (nouveau)
│   ├── queryKeys.js           # clés par domaine                                       (nouveau)
│   ├── sanitize.js            # rendu sûr des extraits <mark> et des details d'audit   (nouveau)
│   ├── formatters.js          # dates, tailles (ko/Mo), niveaux de confidentialité      (nouveau)
│   ├── i18n/                  # fr.js, en.js, useT()                                   (nouveau)
│   └── schema/api.d.ts        # généré depuis /api/openapi.json                        (nouveau)
├── components/
│   ├── ui/                    # primitives sans domaine (A12)
│   └── layout/                # AppShell, Header, Breadcrumb, CampusSwitcher, Toast    (existant + étendu)
├── features/
│   ├── auth/                  # api, hooks, types, index        ✅
│   ├── users/                 # api, hooks, types, index        ✅ (étendu F6.5)
│   ├── documents/             # liste, détail, versions, tags, bulk, corbeille        ✅ F3/F4
│   ├── folders/               # arbre, chemin, création, déplacement                  ✅ F3
│   ├── search/                # recherche, facettes, historique                       ✅ F5
│   ├── notifications/         # liste, compteur, marquage                             ✅ F2
│   ├── dashboard/             # summary, activity, expiring, uploads, recent          ✅ F2
│   ├── campuses/              # CRUD + bascule de statut (super admin) + périmètre    ✅ F6
│   ├── settings/              # réglages (schéma typé) + institution + public          ✅ F4/F6
│   ├── referentials/          # départements, types, tags, rôles (lecture + écriture) ✅ F3/F6
│   ├── permissions/           # accords document/dossier + check                      ✅ F6
│   ├── audit/                 # journal + export CSV                                  ✅ F6
│   └── retention/             # statut, exécution, rapports                           ✅ F6
├── pages/                     # une route = un compositionnaire, zéro requête axios
└── mocks/                     # handlers MSW (tests uniquement)                       ✅
```

**Conventions** : fichiers `camelCase`, extensions **`.ts`/`.tsx` pour tout fichier nouveau** et
pour les `.js` migrés (Q1), hooks `useXxx`, exports nommés via `index.js`, commentaires
**uniquement sur le « pourquoi »**, copies d'interface en français centralisées (A8), aucune
donnée serveur en `useState` (A2).

---

## 4. Contrat écran → API (traçabilité)

> Source : `GET /api/openapi.json` + marqueurs `__guards__` réels des routes (extraits le
> 02/10/2026). État : 🟢 appelé par un écran · 🟡 client/hook prêt, écran absent · 🔴 rien côté
> frontend. **Garde** : `public` · `auth` (`@session_required`) · `admin` · `super admin` ·
> `permission` (moteur D6) · `role` (admin ou secrétaire).

### 4.1 Session & compte (16) — 🟢 socle branché

| Endpoint                                                                      | Garde  | État | Écran / feature                                           |
| ----------------------------------------------------------------------------- | ------ | ---- | --------------------------------------------------------- |
| `POST /auth/login` · `POST /auth/verify-2fa`                                  | public | 🟢   | `pages/login` (LoginForm, TwoFactorAuth)                  |
| `GET /auth/me`                                                                | auth   | 🟢   | `ProtectedRoute`, `RootRedirect`                          |
| `POST /auth/logout`                                                           | auth   | 🟢   | Header                                                    |
| `POST /auth/forgot-password`                                                  | public | 🟢   | `ForgotPassword`                                          |
| `GET /auth/sessions` · `DELETE /auth/sessions` · `POST /auth/sessions/revoke` | auth   | 🟢   | `/account` « Mes appareils » (F1, révocation confirmée)   |
| `POST /auth/reset-password`                                                   | public | 🟢   | `/reset-password?token=` (F1)                             |
| `POST /auth/change-password`                                                  | auth   | 🟢   | `/account` (F1)                                           |
| `POST /auth/2fa/enable` · `/confirm` · `/disable`                             | auth   | 🟢   | `/account` (F1)                                           |
| `POST /auth/session/extend`                                                   | auth   | 🔴   | optionnel (TTL glissant serveur), non consommé            |
| `GET /auth/security-alerts` · `PUT /auth/security-alerts/<id>/resolve`        | auth   | 🟢   | `/account` + `ActivityPanel` (F1, journal réel depuis F6) |

### 4.2 Utilisateurs (11) — 🟢 complet (F6.5)

| Endpoint                                      | Garde | État | Écran / feature                                                              |
| --------------------------------------------- | ----- | ---- | ---------------------------------------------------------------------------- |
| `GET /users` · `GET /users/<id>`              | admin | 🟢   | `/user-management` — pagination et filtres serveur pilotés par l'URL (F6.5)  |
| `POST /users` · `PUT /users/<id>`             | admin | 🟢   | `UserModal` complet (matricule, username, rôle, **campus** Q2, mot de passe) |
| `DELETE /users/<id>`                          | admin | 🟢   | soft delete confirmé (F6.5)                                                  |
| `POST /users/<id>/reset-password`             | admin | 🟢   | `temporary_password` affiché (M10 clos)                                      |
| `POST /users/import` · `GET /users/export`    | admin | 🟢   | CSV import (rapport d'erreurs) / export filtré                               |
| `GET /users/statistics`                       | admin | 🟢   | encart statistiques (F6.5)                                                   |
| `GET /users/roles` · `GET /users/departments` | auth  | 🟢   | filtres et formulaires                                                       |

> ⚠️ **Point clos (Q10)** : `GET /users` a été passé `@admin_required` côté backend avant F0 —
> l'écran est de toute façon gardé `RequireRole Admin` (M6).

### 4.3 Documents, versions, corbeille (15) — 🟢 (F3/F4)

| Endpoint                                                                           | Garde      | État |
| ---------------------------------------------------------------------------------- | ---------- | ---- |
| `GET /documents` (filtres, tri, `page`/`cursor`, `campus_id` super admin)          | auth       | 🟢   |
| `POST /documents` (JSON ou multipart → v1)                                         | auth       | 🟢   |
| `GET /documents/<id>` (versions, tags, droits)                                     | permission | 🟢   |
| `PATCH /documents/<id>` · `DELETE /documents/<id>` (soft) · `POST /<id>/restore`   | permission | 🟢   |
| `POST /documents/bulk` (`move / delete / restore / confidentiality`)               | auth       | 🟢   |
| `GET /documents/export` (CSV)                                                      | auth       | 🟢   |
| `POST /<id>/versions` · `GET /<id>/versions` · `POST /<id>/versions/<vid>/restore` | permission | 🟢   |
| `GET /<id>/versions/<vid>/download` · `GET /<id>/preview`                          | permission | 🟢   |
| `POST /<id>/tags` · `DELETE /<id>/tags`                                            | permission | 🟢   |

### 4.4 Dossiers & référentiels (18 + 7) — 🟢 (F3 lecture · F6 écriture)

| Endpoint                                                            | Garde                   | État |
| ------------------------------------------------------------------- | ----------------------- | ---- |
| `GET /folders?…&view=tree` · `GET /folders/<id>` · `GET /<id>/path` | auth                    | 🟢   |
| `POST /folders` · `PATCH /folders/<id>`                             | role (admin/Secrétaire) | 🟢   |
| `DELETE /folders/<id>` · `POST /folders/<id>/move`                  | admin                   | 🟢   |
| `GET /departments[/<id>]` · `GET /doc-types[/<id>]` · `GET /tags`   | auth                    | 🟢   |
| écritures `POST/PATCH/DELETE` sur départements, types, tags         | admin                   | 🟢   |
| `GET\|POST\|PATCH\|DELETE /roles[/<id>]`                            | admin                   | 🟢   |

> `GET /users/roles` et `GET /users/departments` (§4.2) sont les **alias frontend** conservés.

### 4.5 Recherche (3) — 🟢 (F5, sauf R6‑01)

| Endpoint                                                        | Garde                    | État |
| --------------------------------------------------------------- | ------------------------ | ---- |
| `GET /search?q=&…&page` (facettes, extrait `<mark>`, `took_ms`) | auth (60/min, 120 admin) | 🟢   |
| `GET /search/history` · `DELETE /search/history`                | auth                     | 🟢   |

### 4.6 Tableau de bord (5) + notifications (5) — 🟢 (F2)

| Endpoint                                                                           | Garde                 | État |
| ---------------------------------------------------------------------------------- | --------------------- | ---- |
| `GET /dashboard/summary`                                                           | auth (adapté au rôle) | 🟢   |
| `GET /dashboard/activity` · `/expiring` · `/uploads` · `/recent-documents`         | auth                  | 🟢   |
| `GET /notifications` · `GET /notifications/unread-count`                           | auth                  | 🟢   |
| `PATCH /notifications/<id>/read` · `POST /notifications/read-all` · `DELETE /<id>` | auth                  | 🟢   |

### 4.7 Administration : campus, institution, réglages, permissions, audit, rétention (29) — 🟢 (F6, sauf lecture accords dossier)

| Endpoint                                                                 | Garde        | État                                                                                           |
| ------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------- |
| `GET /campuses` · `GET /campuses/<id>`                                   | auth         | 🟢                                                                                             |
| `POST /campuses` · `PUT\|DELETE /campuses/<id>`                          | super admin  | 🟢                                                                                             |
| `PATCH /campuses/<id>/status` (bascule, **pas** de suppression physique) | super admin  | 🟢                                                                                             |
| `GET /institution` (public) · `PUT /institution`                         | public/admin | 🟢                                                                                             |
| `GET /settings/schema` · `GET\|PUT /settings` · `GET /settings/defaults` | admin        | 🟢                                                                                             |
| `GET /settings/public` (logo, langue, extensions, taille max)            | public       | 🟢                                                                                             |
| `GET /permissions/document/<id>` · `/grants` · `POST /permissions/check` | auth         | 🟢                                                                                             |
| `PUT\|DELETE /permissions/document/<id>/{user\|role}/<id>`               | auth         | 🟢                                                                                             |
| `PUT\|DELETE /permissions/folder/<id>/{user\|role}/<id>`                 | admin        | 🟡 (hooks prêts, aucun écran : **lecture des accords dossier absente**, ligne candidate R6‑04) |
| `GET /audit` · `GET /audit/export`                                       | admin        | 🟢                                                                                             |
| `GET /admin/retention/status` · `GET /admin/retention/reports`           | super admin  | 🟢                                                                                             |
| `POST /admin/retention/run` (`dry_run`, `campus_id`)                     | super admin  | 🟢                                                                                             |

### 4.8 Système (5) — 🔴 (utiles : état de service et version affichables)

`GET /health` · `GET /health/ready` · `GET /api/version` · `GET /api/openapi.json` (source du
codegen A3) · `GET /api/docs` (console, hors bundle).

---

## 5. Phase F0 — Fondations et qualité (bloquant, tout d'abord)

> **Rien d'autre ne démarre tant que F0 n'est pas verte** : ce sont les fondations sur lesquelles
> repose 100 % des phases suivantes (tests, gardes, erreurs, budget).

| ID    | Tâche                                                                                                                                                       | Livrable                         | Acceptation                                              | **État** |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------- | -------- |
| F0.1  | **`npm run lint` vert** : corriger les 25 problèmes (vars mortes, optional chaining, échappements, deps `useEffect`)                                        | commit                           | `npx eslint .` → 0 problème                              | ✅       |
| F0.2  | **Harness de tests** : Vitest + RTL + `user-event` + MSW, fixtures `renderWithProviders()`, `setupTests.js`                                                 | `vitest.config.js`, `src/mocks/` | `npm test` vert sur ≥ 10 tests                           | ✅       |
| F0.3  | **Tests de non-régression du socle** : `lib/api.js` (CSRF sur mutation, 401 → login), `useAuth` (me/login/2fa/logout), `RoleGuard`                          | `src/**/__tests__/`              | couverture `features/auth` ≥ 70 %                        | ✅       |
| F0.4  | **Codegen de contrat + TS** : `tsconfig.json` (`allowJs`, `checkJs`) + `npm run codegen` depuis `/api/openapi.json` → `src/lib/schema/api.d.ts`             | config + types générés           | régénérer = 0 diff inattendu · `tsc --noEmit` = 0 erreur | ✅       |
| F0.5  | **Routes lazy + ErrorBoundary par route** (`router.jsx`) puis `manualChunks` vendors                                                                        | commit                           | 0 import statique de page dans `Routes.jsx`              | ✅       |
| F0.6  | **Budget de bundle** : `size-limit` (≤ 200 ko gzip initial) branché au `build`                                                                              | config + CI                      | `npm run build` sous le budget                           | ✅       |
| F0.7  | **Gardes déclaratives** : `RequireAuth`, `RequireRole` (brancher le `RoleGuard` mort), `RequireScope` + pages 403 dédiées                                   | `features/auth/components/`      | un étudiant sur `/user-management` → 403                 | ✅       |
| F0.8  | **Couche d'erreurs** : `lib/errors.js`, `ToastProvider`, `ConfirmDialog` ; remplacer les 13 `alert()`/`confirm()`                                           | commit                           | `grep -rn "alert(" src/` vide                            | ✅       |
| F0.9  | **Navigation propre** : `navigate()` au lieu des 28 `window.location`, `document.title` + `Breadcrumb` routés, `lang` correct dans `index.html`             | commit                           | navigation sans rechargement de page                     | ✅       |
| F0.10 | **Nettoyage** : supprimer les données factices de démo dans les pages (elles deviennent des fixtures MSW), dédupliquer `mapBackendRole` en `lib/formatters` | commit                           | plus aucune table de données hardcodée                   | ✅       |
| F0.11 | **CI frontend** `.github/workflows/ci.yml` (lint → test → build → size-limit)                                                                               | workflow                         | badge vert (push du dépôt `frontend/`)                   | ✅       |
| F0.12 | **README réel** (installation, `VITE_API_URL`, `npm run dev` contre `docker compose`, tests, architecture A1)                                               | `README.md`                      | un nouveau dev démarre en ≤ 10 min                       | ✅       |

**Estimation F0 : ~6 j** (+1 j pour le socle TypeScript, décision Q1) — _critère de sortie :
`lint` + `test` + `build` verts, `tsc --noEmit` à 0 erreur, CI verte, budget de bundle respecté._

---

## 6. Découpage en phases

> **Préfixe `F`** (frontend) pour ne pas confondre avec les phases `P0…P6` du plan backend.
> Estimations en **jours-homme** (1 développeur) — à ajuster après lecture.

| Phase                | Contenu                                                                                                               | Est.      | Dépend de |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- | --------- |
| **F0** ✅            | Fondations & qualité (§5)                                                                                             | 6 j       | —         |
| **F1** ✅            | **Session & compte** (profil, appareils, mdp, 2FA, alertes, reset)                                                    | 3 j       | F0        |
| **F2** ✅            | **Tableau de bord & notifications** (5 + 5 endpoints)                                                                 | 4 j       | F0        |
| **F3** ✅            | **Bibliothèque & structure** (dossiers, documents, versions, corbeille, bulk, export, lecture des référentiels)       | 8 j       | F0        |
| **F4** ✅            | **Dépôt & versions** (multipart, progression, contrôles, statut OCR)                                                  | 5 j       | F3        |
| **F5** ✅            | **Recherche** (full-text, facettes, extrait, historique, sauvegardes)                                                 | 4 j       | F3        |
| **F6** ✅            | **Administration multi-campus** (campus, réglages, référentiels, utilisateurs complet, permissions, audit, rétention) | 9 j       | F1‑F5     |
| **F7** _(optionnel)_ | Durcissement : i18n complète, audit accessibilité, e2e Playwright étendu, virtualisation des grandes listes           | +4 j      | F6        |
|                      | **Total F0→F6**                                                                                                       | **~39 j** |           |

### F1 — Session & compte

1. Écran **Mon compte** : profil (lecture `GET /auth/me`), changement de mot de passe
   (`POST /auth/change-password`) avec validation des règles serveur.
2. **Mes appareils** : `GET /auth/sessions` + révocation unitaire (`sessions/revoke`) et globale
   (`DELETE /auth/sessions`) — les hooks existent, l'écran non.
3. **2FA** : `enable` → `confirm` (QR/code) → `disable`, avec états intermédiaires et erreurs
   `429` (10/min) traduites (A5).
4. **Alertes de sécurité** : `GET /auth/security-alerts` + `PUT …/resolve` → remplace les
   `mockSecurityAlerts` de `ActivityPanel`.
5. **Lien de réinitialisation** : route `/reset-password?token=` → `POST /auth/reset-password`
   (le flux « j'ai oublié mon mot de passe » s'arrête aujourd'hui après l'envoi de l'email).
6. Correction M10 : afficher le `temporary_password` renvoyé par
   `POST /users/<id>/reset-password` (copie dans le presse-papier + avertissement), et plus de
   message « email envoyé » si ce n'est pas le cas.

_Acceptation_ : depuis l'interface, un utilisateur change son mot de passe, active la 2FA, voit et
révoque ses sessions, résout une alerte, et parcourt le lien email de réinitialisation de bout en
bout.

### F2 — Tableau de bord & notifications

1. `GET /dashboard/summary` → `StatsOverview` (les cartes existantes reçoivent enfin de vraies
   données, variants par rôle renvoyés par l'API).
2. `GET /dashboard/activity` → `RecentActivity` · `GET /dashboard/recent-documents` →
   `RecentDocuments` (liens vers `/document-library` filtré) · `GET /dashboard/uploads` → graphe
   (`recharts`, **chunk séparé**, A10).
3. `GET /dashboard/expiring` → bloc « échéances » (préavis J‑30) + `SystemStatus` remplacé par
   `GET /health/ready` et `GET /api/version` pour l'admin.
4. **Notifications** : `unread-count` pollé (30-60 s, Q5), panneau Header branché, marquage lu /
   lu-tout / suppression, page « toutes les notifications ».
5. `GET /dashboard/*` renvoie des jeux **vides** aux rôles non concernés → `EmptyState` (A9).

_Acceptation_ : le tableau de bord affiche les vrais compteurs d'un compte seedé (`flask seed
demo`), une notification de dépôt apparaît après un upload, et le compteur du Header se met à jour
sans recharger.

### F3 — Bibliothèque & structure

1. **Dossiers** : `GET /folders?view=tree`, chemin (`/<id>/path`), création/édition (rôle
   admin/Secrétaire), déplacement avec anti-cycle (`409` traduit), suppression refusée si non vide.
2. **Liste des documents** : filtres mappés sur l'API (`q, folder_id, department_id, doc_type_id,
status, confidentiality, tag_ids, created_from/to, sort`) → **état dans l'URL** (partageable,
   revenir en arrière conserve les filtres), tri, pagination serveur (`page/per_page`) et bascule
   `pagination=keyset` pour les grands volumes.
3. **Détail** : versions (historique, restauration), tags (ajout/retrait), droits affichés
   (`GET /permissions/document/<id>`), boutons d'action activés par permission réelle.
4. **Téléchargement / aperçu** : `GET /<id>/versions/<vid>/download` (blob, nom de fichier sûr) et
   `GET /<id>/preview` (PDF/images inline, `URL.createObjectURL` révoquée au démontage) — le
   **chiffrement au repos est transparent** côté client (le serveur déchiffre).
5. **Corbeille & actions groupées** : `DELETE` (soft) → `POST /<id>/restore`, `POST /documents/bulk`
   pour `move / delete / restore / confidentiality`, avec `ConfirmDialog` (A5).
6. **Export CSV** : `GET /documents/export` avec les mêmes filtres que la liste (même mécanique
   que l'export utilisateurs, en corrigeant le `noopener`).
7. Lecture des **référentiels** (types, tags, départements) pour alimenter les filtres.

_Acceptation_ : parcours réel complet — créer un dossier, ouvrir un document, changer son niveau de confidentialité, créer une version, la restaurer, la télécharger, le déplacer en
corbeille puis le restaurer — le tout **piloté par l'URL** (une URL copiée rouvre la même vue).

### F4 — Dépôt & versions

1. **Upload multipart** réel : `POST /documents` (création + fichier → v1) puis
   `POST /<id>/versions` pour les versions suivantes, avec **progression réelle** (XHR
   `onUploadProgress`), annulation (AbortController) et file d'attente (`BatchUploadManager`).
2. **Contrôles client alignés sur le serveur** : extensions et taille max lues dans
   `GET /settings/public` (plus de constante `50 * 1024 * 1024`), refus avant envoi.
3. **Erreurs serveur traduites** : `413` (taille), `422` (extension / magic bytes / contenu),
   `429` (30 req/min : message « réessayez dans X s »), `conflict` (dossier rattaché).
4. **Formulaire métadonnées** : dossiers/départements/types/tags/niveaux chargés par API, niveau
   `confidential|secret` = **chiffrement au repos** signalé explicitement à l'utilisateur.
5. **Statut OCR** : affiché si `features.ocr_enabled` (réponse du dépôt), extraction best-effort
   non bloquante (P6 backend).
6. **Intégration scan** : le composant est entièrement mocké et le backend n'expose aucun
   endpoint de scanner → remplacé par un état « non disponible » (**pas** de faux-positif), ou
   demande d'endpoint = ligne **R6 backend** si le besoin est confirmé.

_Acceptation_ : déposer 3 fichiers (dont un refusé pour extension) donne une file d'attente
cohérente, un document accessible dans la bibliothèque, et un second dépôt crée bien la **version
N+1** visible dans l'historique.

### F5 — Recherche

1. `GET /search` : construction des paramètres (`q, department_id, doc_type_id, tag_ids,
date_from, date_to, page`), **debounce 300 ms**, état dans l'URL, indicateurs `took_ms` et
   nombre de résultats.
2. **Facettes** renvoyées par l'API → filtres cliquables (`SearchFilters`), synchro avec l'URL.
3. **Extrait surligné** : les `<mark>` sont rendus via `lib/sanitize` (**jamais**
   `dangerouslySetInnerHTML`, A6), correspondances cliquables → fiche document.
4. **Historique** : `GET /search/history` (dédupliqué) + `DELETE` (vider), réutilisation d'une
   requête passée.
5. **Recherches sauvegardes** : le composant `SavedSearches` n'a **aucun endpoint** →
   implémentation `localStorage` **ou** demande backend (R6) — arbitrage Q6.
6. Gestion des limites : `429` (60/min, 120 admin) traduit en « pause » plutôt qu'en erreur.

_Acceptation_ : une recherche sur le titre renvoie l'extrait surligné correct, une facette clique
filtre sans perte d'état, et l'URL copiée rouvre exactement la même vue.

### F6 — Administration multi-campus

1. **Campus** : `GET/POST/PUT/DELETE /campuses` + `PATCH /<id>/status` (super admin) — création,
   édition, bascule d'activation, `409` « ressources rattachées » traduit ; **pas** de suppression
   physique dans l'UI (contrainte Q4 backend).
2. **Sélecteur de campus** (A4) + bandeau de périmètre sur tous les écrans admin.
3. **Réglages** : éditeur piloté par `GET /settings/schema` (types, défauts, aide, portée
   global/campus), `PUT /settings` en batch, `GET /settings/defaults`, aperçu `GET /settings/public`
   ; **Institution** (`GET/PUT /institution`).
4. **Référentiels en écriture** : départements, types de documents, tags, rôles (CRUD complet,
   `409` sur conflit, archivage plutôt que suppression).
5. **Utilisateurs complets** : pagination **serveur** (filtres `search, role_id, department_id,
is_active`), champ **`campus_id`** dans le formulaire (règle Q2 backend — dépend du correctif
   backend listé en R6), mot de passe à la création, `DELETE` branché, statistiques
   (`GET /users/statistics`), import/export CSV avec rapport d'erreurs détaillé.
6. **Actions groupées utilisateurs** : l'API n'existe pas → soit on **masque** les actions
   (recommandé) soit on demande `POST /api/users/bulk` au backend (**R6**, Q7).
7. **Permissions** : écran d'accords par document/dossier (utilisateur ou rôle,
   `can_view/download/edit/delete`), révocation, et `POST /permissions/check` en outil de débogage.
8. **Audit** : `GET /audit` filtré (`action, object_type, user_id, from/to`) + `GET /audit/export`.
   Le panneau `ActivityPanel` de la page utilisateurs passe sur `GET /dashboard/activity`.
9. **Rétention** : `GET /admin/retention/status`, `POST /admin/retention/run` (`dry_run` d'abord),
   `GET /admin/retention/reports` — réservé au super admin.

_Acceptation_ : un super admin crée un second campus, y rattache un département et un compte, voit
ce compte **dans** le périmètre de ce campus (et hors périmètre ailleurs), édite un réglage de ce
campus, consulte l'audit filtré et lance un `dry_run` de rétention — sans jamais toucher à la base.

### F7 _(optionnel)_ — Durcissement — ✅ partiel (05/10/2026) : a11y + e2e livrés

1. i18n complète (FR/EN) : plus aucune chaîne en dur, `document.documentElement.lang`, langue
   serveur comme défaut. — ⏳ **non fait** (repoussé ; cf. §13.8).
2. **Audit d'accessibilité** : navigation clavier complète, focus visible, ARIA sur tables/modales,
   contraste AA (tokens), tests `@axe-core/react`. — ✅ **livré** (vitest-axe en tests unitaires
   plutôt que `@axe-core/react` — décision 05/10/2026, cf. §13.8).
3. **E2E Playwright** étendu : parcours admin complet + cas d'erreur (403 inter-campus, 413, 429).
   — ✅ **livré** (campagne sur stack docker réelle, cf. §13.8).
4. Grandes listes : virtualisation (> 200 lignes), préférence de densité, filtres persistés. —
   ⏳ **non fait** (hors périmètre de la demande).
5. Journal d'application : reporting d'erreurs front (sans donnée personnelle) si jugé utile.

---

## 7. Stratégie de tests & qualité

| Niveau          | Outil                                      | Cible                                       | Bloquant                                |
| --------------- | ------------------------------------------ | ------------------------------------------- | --------------------------------------- |
| Unitaire        | Vitest (`renderHook`, `lib/*`)             | hooks Query, mapping d'erreurs, formatters  | ✅ CI                                   |
| Composant       | Vitest + RTL + user-event                  | primitives UI, formulaires, modales, gardes | ✅ CI                                   |
| Contrat         | MSW généré depuis `/api/openapi.json`      | 0 dérive silencieuse de payload             | ✅ CI                                   |
| Non-fonctionnel | ESLint (0) + `tsc --noEmit` + `size-limit` | dette, budget de bundle                     | ✅ CI                                   |
| E2E             | Playwright (`docker compose up --build`)   | parcours utilisateur réel                   | ✅ F0 (fumée) / F7 (campagne, 11 tests) |
| Manuel          | Checklist par phase (§6) + relevé d'état   | validation à chaque merge `--no-ff`         | ✅                                      |

- **Ordre d'exécution** : test d'abord (rouge) → correctif → vert → commit → merge.
- Les données de test proviennent de `flask seed demo` (backend) + fixtures MSW (frontend) ;
  **aucune** donnée de production n'est touchée, aucun compte d'admin réel dans les tests E2E.

---

## 8. Exigences permanentes (toutes phases)

- **Sécurité** : cookies HTTPOnly uniquement, CSRF sur toute mutation, `dangerouslySetInnerHTML`
  interdit, aucun secret dans `VITE_*`, `noopener` sur les liens externes, garde de route + refus
  serveur (le serveur fait foi).
- **Périmètre campus** : jamais de filtrage client « maison » (A4) ; un 403 est affiché comme tel,
  jamais transformé en liste vide.
- **Performance** : budget de bundle par phase, pas de requête non mise en cache (Query), debounce
  sur les saisies, pagination serveur obligatoire (aucune liste complète en mémoire).
- **Qualité** : `lint` + `test` + `build` verts avant chaque commit ; **0 `alert()`**, **0
  `window.location`**, **0 donnée factice** ; couverture `features/**` ≥ 70 %.
- **Accessibilité** : clavier, focus visible, labels de formulaire, contrastes AA, messages
  d'erreur liés aux champs (`aria-describedby`).
- **UX** : 4 états par écran (chargement/vide/erreur/données), confirmation sur toute action
  destructive, retour explicite sur les opérations longues (upload, export).

---

## 9. Livrables documentaires

| Fichier                                            | À jour ?     | Après                                                                                       |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| **`07_plan_frontend_multicampus.md`** (ce fichier) | ✅ rédigé    | cases cochées à chaque phase (suivi §13)                                                    |
| `07_plan_backend_multicampus.md`                   | ✅ **+ §14** | lignes **R6‑01/R6‑02** créées le 02/10/2026 ; toute nouvelle demande = ligne supplémentaire |
| `08_api_reference.md`                              | ✅           | reste la référence des contrats (inchangé ici)                                              |
| `03_etat_avancement.md`                            | ⏳           | mis à jour à chaque fin de phase (statut frontend)                                          |
| `frontend/README.md`                               | ✅           | réécrit en **F0.12** (installation, tests, architecture)                                    |

---

## 10. Risques & atténuation

| #   | Risque                                                                           | Atténuation                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Dérive du filtrage campus fait côté UI (données faussement rassurantes)          | **A4** : le serveur scope ; tests E2E avec deux campus ; aucun `filter(campus)` client                                                                         |
| R2  | Contrat API qui dérive des payloads frontend                                     | **A3** : codegen OpenAPI en CI (diff = échec) + MSW généré                                                                                                     |
| R3  | Bundle qui explose avec chaque écran (`recharts`, `d3`, modales)                 | **A10** : lazy par route + `size-limit` bloquant dès F0                                                                                                        |
| R4  | Mocks qui survivent au branchement (un écran « marche » mais affiche du factice) | **A9** : gate de sortie « 0 donnée factice » dans chaque phase + `grep mock` dans la checklist                                                                 |
| R5  | Fausse sécurité : garde UI pris pour un contrôle d'accès                         | **A7** : gardes = confort, **le backend refuse** ; tests E2E des `403`                                                                                         |
| R6  | Dérive du périmètre (« pendant qu'on y est, ajoutons une fonctionnalité »)       | Chaque tâche est numérotée ; **toute demande hors liste = nouvelle ligne dans ce plan** (et besoin API = ligne **R6 du plan backend**), puis validation        |
| R7  | Session expirée pendant un upload long / export                                  | Intercepteur `401` préservé pendant les uploads (message « session expirée, reconnectez-vous » sans perte de file) + `POST /auth/session/extend` si jugé utile |
| R8  | Charge : ~39 j                                                                   | Ordre F0 → F3 → F4 : dès **F3 le produit est démontrable** (bibliothèque réelle) ; F1/F2 en parallèle possible car indépendants                                |
| R9  | Tests E2E fragiles (rate limits login 5/min, 2FA systématique)                   | Comptes de jeu de test, codes 2FA lus en base (comme le script E2E backend), attentes explicites, pas de `sleep` arbitraire                                    |

---

## 11. Questions à trancher — ⭐ à valider avant F0

> Réponses brutes de l'utilisateur conservées en italique ; la colonne « **Décision proposée** »
> est celle appliquée à l'implémentation après validation ⭐.

| #   | Question                                                                                                                                       | Réponse de l'utilisateur         | **Décision proposée**                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Typage : **TypeScript** ou **JSDoc + `checkJs`** ?                                                                                             | TypeScript **progressif**        | **TypeScript progressif** (choix explicite) : `allowJs` + `checkJs` transitoire, **tous les fichiers nouveaux en `.ts`/`.tsx`**, migration domaine par domaine (`features/auth` en premier), `tsc --noEmit` bloquant en CI dès F0 (voir A3 et F0.4).                                                                    |
| 2   | Validation **runtime** des réponses (zod) ou uniquement types + tests MSW ?                                                                    | ⚠️ _à trancher_                  | **`zod` en frontière partout** (`features/*/api.js` valide les réponses via `lib/validate.js`) — appliqué dès F0.                                                                                                                                                                                                       |
| 3   | i18n : **FR seul** ou **FR/EN** avec lib (`i18next`) ?                                                                                         | ⚠️ _à trancher_                  | **FR seul pour l'instant** (Q3) : libellés FR centralisés ; i18n complète repoussée en F7.                                                                                                                                                                                                                              |
| 4   | Sélecteur de campus : **bascule super admin** ou filtre visible partout ?                                                                      | Bascule super admin              | **Bascule super admin (A4) confirmée** : sélecteur de campus visible uniquement pour un `Admin` sans `campus_id` ; les autres rôles affichent leur périmètre en lecture seule, sans filtre modifiable.                                                                                                                  |
| 5   | Notifications : **polling** du compteur ou WebSocket ?                                                                                         | ⚠️ _à trancher_                  | **Polling 30-60 s** : le backend n'a pas de canal temps réel ; un WebSocket serait une ligne **R6 backend**.                                                                                                                                                                                                            |
| 6   | **Recherches sauvegardes** : `localStorage` ou endpoint backend ?                                                                              | Ajouter les endpoints au plan 07 | **Endpoint backend retenu** → ligne **R6‑01** du plan 07 backend (§14 : `GET/POST/DELETE /api/search/saved`) ; implémentation en **P7 backend** (~1 j), écran branché en **F5**. L'alternative `localStorage` est écartée.                                                                                              |
| 7   | **Actions groupées utilisateurs** : masquer ou demander `POST /users/bulk` ?                                                                   | Ajouter les endpoints au plan 07 | **Endpoint backend retenu** → ligne **R6‑02** du plan 07 backend (§14 : `POST /api/users/bulk`) ; implémentation en **P7 backend** (~1 j), écran branché en **F6**. En attendant, les actions groupées restent **masquées** (pas d'`alert()`).                                                                          |
| 8   | **E2E Playwright** : fumée en F0 ou campagne complète en F7 ?                                                                                  | ⚠️ _à trancher_                  | **Fumée en F0** (login → dashboard → users), **campagne en F7** : on ne pousse pas d'E2E sur des écrans non branchés.                                                                                                                                                                                                   |
| 9   | Portée des écrans d'administration : **menu « Administration »** regroupé ?                                                                    | ⚠️ _à trancher_                  | **Oui** : un espace `Administration` (campus, réglages, référentiels, utilisateurs, permissions, audit, rétention) derrière `RequireRole` + `RequireScope`, le reste en espace utilisateur.                                                                                                                             |
| 10  | Correction des défauts backend repérés par le test E2E (snippet `<mark>`, `campus_id` à la création, `GET /users` ouvert à tout authentifié) ? | Corriger d'abord le backend      | **Traitement prioritaire avant F0** : les 3 défauts repérés par le test de bout en bout (extrait `<mark>` sur PostgreSQL, `campus_id` ignoré à la création d'un compte, `GET /users` ouvert à tout authentifié) sont corrigés sur **branche backend** avec tests de non-régression, comme prévu au §13 du plan backend. |

**Tranché le 02/10/2026** : Q1 (TypeScript progressif), Q4 (bascule super admin), Q6/Q7 (2 lignes
**R6** ajoutées au plan backend §14), Q10 (corrections backend avant F0).
**Tranché en F0 (02/10/2026)** : Q2 (**zod en frontière partout**, appliqué dès `features/auth` et
`features/users`) · Q3 (**FR seul** pour l'instant) · Q5 (**polling 30-60 s** du compteur de
notifications) · Q8 (**fumée E2E en F0**, campagne en F7) · Q9 (**menu « Administration » regroupé**
derrière `RequireRole`/`RequireScope`). **Plus aucune question ouverte.**

---

## 12. Checklist de validation finale (« frontend 100 % »)

- [ ] **Aucun écran sur données mock** : `grep -rn "mock" src/pages` vide (sauf fixtures MSW).
- [ ] Les **114 opérations** de l'API sont soit consommées, soit explicitement documentées comme
      hors périmètre (§4 à jour, marques 🟢/🟡/🔴).
- [ ] `npm run lint` = 0 problème · `npm test` vert · `tsc --noEmit` 0 erreur · CI verte.
- [ ] Budget de bundle respecté (≤ 200 ko gzip initial), chaque route en chargement paresseux.
- [ ] **Aucun `alert()`**, **aucun `window.location`**, **aucune donnée serveur en `useState`**.
- [ ] Gardes : `RequireAuth` partout, `RequireRole` sur les écrans admin, `RequireScope` sur les
      écrans super admin ; écrans **403** et **404** propres.
- [ ] Multi-campus : sélecteur + bandeau de périmètre visibles, **aucun** filtrage client (A4).
- [ ] Sécurité : `dangerouslySetInnerHTML` interdit et non utilisé, CSRF intact, aucun secret
      dans le bundle, exports en `noopener`.
- [ ] E2E fumée (F0) + campagne (F7) vertes sur `docker compose up --build`.
- [ ] Couverture `features/**` ≥ 70 %, `README.md` réel, documents `03`/`07` à jour.

---

## 13. Suivi d'avancement

> Une section de **sortie de phase** par merge `--no-ff` : périmètre livré, preuves (commits,
> tests, mesures), écarts par rapport à l'estimation et retours ouverts.

### 13.0 Constats initiaux (02/10/2026)

- Socle vérifié et **validé** : client HTTP session/CSRF, parcours login → 2FA → dashboard,
  gestion utilisateurs branchée, build Docker/Nginx opérationnel.
- **Dette mesurée** : 25 problèmes ESLint, 0 test, 1 bundle de 1 391 ko (311 ko gzip),
  13 `alert()`, 28 `window.location`, 111 `useState` en `pages/`, **0 `campus`** dans le code.
- **Couverture API : 13/114 opérations (≈ 11 %)** — les domaines `documents`, `search`,
  `dashboard`, `notifications`, `audit`, `retention`, `settings`, `campuses`, `permissions`,
  `folders`, `referentiels` ne sont **pas consommés du tout**.

### 13.1 F0 — Fondations et qualité ✅ (02/10/2026)

**Périmètre livré** : design system unifié (tokens canoniques, primitives corrigées, `AppIcon`
`currentColor`, règle ESLint `local/no-raw-colors`) · couche d'erreurs (`lib/errors.js`,
`lib/validate.js` avec zod, `Toast`/`ConfirmDialog`, 0 `alert()`) · navigation propre
(`navigate()` partout, `document.title` par route) · gardes `RequireAuth`/`RequireRole`/`RequireScope`+
pages 403/404 · tests Vitest + RTL + MSW · codegen OpenAPI + TypeScript progressif · routes
lazy + `manualChunks` · budget `size-limit` · CI GitHub Actions · README réel.

**Preuves** : `npm run lint` → 0 · `npm test` → 23 verts · `tsc --noEmit` → 0 erreur ·
`npm run build` vert (routes découpées) · `npm run size` → **126,43 ko gzip** initial (< 200 ko,
était 311 ko).

**Écarts / retours ouverts** : R6‑01 (`/api/search/saved`) et R6‑02 (`POST /api/users/bulk`)
toujours non implémentés côté backend → masqués/vidés en F5/F6, à rebrancher en P7 (`03_etat_avancement.md`).

### 13.2 F1 — Session & compte ✅ (02/10/2026)

**Périmètre livré** :

- **Mon compte** (`/account`) : profil en lecture (`GET /auth/me`), changement de mot de passe
  (`POST /auth/change-password`, règles client = `validate_password_strength`), réglage 2FA
  (`enable` → `confirm` → `disable`), liste des sessions (`/auth/sessions`) avec révocation unitaire
  et globale, alertes de sécurité (`GET /auth/security-alerts` + résolution).
- **Mes appareils** : sessions serveur réelles (IP, User-Agent résumé via `describeUserAgent`,
  dernière activité), révocation avec `ConfirmDialog`.
- **2FA** : flux en deux temps avec états intermédiaires ; erreurs `429` traduites par `toAppError`.
- **Alertes** : `ActivityPanel` de `user-management` branché sur les alertes réelles du compte
  (`mockSecurityAlerts` supprimé).
- **Lien de réinitialisation** : route publique `/reset-password?token=` → `POST /auth/reset-password`,
  jeton absent ou invalide géré explicitement.
- **M10** : `temporary_password` renvoyé par `POST /users/<id>/reset-password` affiché par toast
  (plus de message « email envoyé »).
- **Primitives ajoutées** : `Skeleton`, `EmptyState` (états chargement/vide de A9).

**Preuves** : `lint` → 0 · `npm test` → **39 verts** (dont `useAccount.test.jsx` ×8 et
`ResetPassword.test.jsx` ×2) · `tsc --noEmit` → 0 erreur · `build` vert · `size` →
**127,59 ko gzip** initial.

**Écarts / retours ouverts** : masse de `useState` en `pages/` (M12, à traiter en F6) ;
`ActivityPanel` garde ses activités factices jusqu'à `GET /dashboard/activity` (F6.8).

### 13.3 F2 — Tableau de bord & notifications ✅ (03/10/2026)

**Périmètre livré** :

- **Domaines `features/dashboard` et `features/notifications`** (api.js → hooks → index.js),
  toutes les réponses validées par zod en frontière (Q2) : `summary`, `activity`, `expiring`,
  `recent-documents`, `uploads`, `readiness`, `version` + `notifications`, `unread-count`,
  `read`, `read-all`, `delete`.
- **Tableau de bord réel** : `StatsOverview` (cartes par rôle renvoyées par l'API :
  `super_admin` / `campus_admin` / `user`), `RecentDocuments`, `RecentActivity` (journal d'audit
  traduit par `getAuditActionMeta`), `ExpiringDocuments` (préavis J‑30, flag `overdue`) et
  `UploadsChart` (`recharts`, **chunk `charts` séparé**). Plus aucun chiffre ni libellé factice.
- **`SystemStatus` remplacé** par `GET /health/ready` (état base/Redis) + `GET /api/version`,
  réservé à l'admin ; `/health/ready` étant hors `/api`, l'URL est dérivée de `API_BASE_URL`.
- **Notifications** : `unread-count` **pollé toutes les 45 s** (Q5), badge et panneau du `Header`
  branchés (marquer lu / tout lu), panneau `NotificationCenter` du tableau de bord et nouvelle
  page `/notifications` (filtre non-lues, marquage, suppression avec `ConfirmDialog`, pagination).
- **États A9** : `Skeleton` au chargement, `EmptyState` sur jeux vides (y compris les rôles non
  concernés, que l'API renvoie vides).
- **Handlers MSW** (`demoSummary`, `demoDocuments`, `demoAudit`, `demoNotification`) + **14 tests**
  (`useDashboard.test.jsx` ×8, `useNotifications.test.jsx` ×6).

**Preuves** : `npm run lint` → 0 · `npm test` → **53 verts** · `tsc --noEmit` → 0 erreur ·
`npm run build` vert · `npm run size` → **150,32 kB** initial (hors graphes) + **58,51 kB** pour le
chunk `charts`, tous deux sous les limites.

**Écarts / retours ouverts** :

- Le glob `size-limit` hérité de F0 (`chunk-vendor-*`) absorbait le chunk graphes pourtant
  _lazy_ → chunk renommé `charts` et **budget dédié** ajouté (`package.json`, `vite.config.js`).
  À noter : `size-limit` v12 mesure en **brotli** (et non en gzip comme écrit par erreur en
  §13.1) — repère de comparaison à corriger à la prochaine sortie de phase.
- « Voir tout » de l'activité pointe vers `/user-management` en attendant l'écran d'audit (F6.7) ;
  l'action rapide « scanner » redirige vers le dépôt (F4).
- La version du pied de page reste décorative (`2.1.0`) : la vraie version est désormais lue par
  `SystemStatus` via `GET /api/version`.
- `NotificationCenter` du tableau de bord et le panneau `Header` ne sont plus mockés (M1/M9 clos).

### 13.4 F3 — Bibliothèque & structure ✅ (04/10/2026)

**Périmètre livré** :

- **Domaines `features/documents`, `features/folders`, `features/referentials`** (api.js → hooks → index.js),
  réponses validées par zod en frontière (Q2) : listing offset **et** `keyset`, détail + versions,
  restauration de version, téléchargement, aperçu, export CSV, bulk, étiquettes, dossiers
  (arbre/chemin/CRUD/move), droits effectifs, référentiels (types/tags/départements).
- **`lib/download.js`** : extraction du nom de fichier depuis `Content-Disposition` (nom assaini),
  téléchargement Blob avec `URL.revokeObjectURL` différée (F3.4).
- **Écran bibliothèque** — l'**URL est la source unique de vérité** (`parseLibraryParams` /
  `toSearchParams` / `toListQuery`, `useSearchParams`) : filtres, tri serveur (`sortable` +
  garde-fou keyset `size_bytes`), pagination **offset ↔ clé** (`pagination=keyset`), dossier courant.
  Aucune donnée serveur en `useState` (M12).
- **Dossiers** (`FolderNavigation`) : fil d'Ariane servi par `GET /folders/<id>/path`, grille
  d'enfants, création/édition (Admin·Secrétaire), suppression (Admin, `ConfirmDialog`) avec
  traduction des `409` `folder_not_empty` / `folder_cycle` (liste des descendants exclue du
  sélecteur de parent).
- **Tableau de documents** (`DocumentTable`) : colonnes réelles, tri cliquable, sélection multiple,
  actions fiche/aperçu/corbeille-restauration ; **actions groupées** (`BulkActionBar`) `move /
delete / restore / confidentiality` via `POST /documents/bulk` + `ConfirmDialog` ; **export CSV**
  avec les mêmes filtres que la liste (F3.6, `noopener` hérité corrigé).
- **Aperçu** (`DocumentPreviewModal`) : préchargement Blob avant affichage, `URL.createObjectURL`
  révoquée au démontage, repli téléchargement si `422 preview_not_supported` (F3.4).
- **Fiche document** `/document-library/:documentId` : métadonnées, statut/confidentialité
  (`Badge`), indicateur chiffré, **droits effectifs** servis par
  `GET /permissions/document/<id>` (boutons activés par `rights.*.allowed`, libellés de règle FR),
  historique des versions (téléchargement / restauration) et étiquettes (ajout/retrait si `edit`).
- **Référentiels** en lecture pour alimenter les filtres (`doc-types`, `tags`, `departments`,
  `staleTime` 5 min).
- **MSW** : fixtures `demoDocumentDetail`, `demoFolder(Tree)`, `demoPermissions`, `demoDocTypes`,
  `demoTags` + handlers documents/dossiers/référentiels ; `export` déclaré **avant** `/documents/:id`.

**Preuves** : `npm run lint` → 0 · `npm test` → **80 verts** (dont `urlState.test.js` ×8,
`useDocuments.test.jsx` ×9, `useFolders.test.jsx` ×6, `DocumentLibrary.test.jsx` ×2 et
`DocumentDetail.test.jsx` ×2) · `tsc --noEmit` → 0 erreur · `npm run build` vert · `npm run size` →
**150,95 kB** initial (hors graphes) + **58,62 kB** pour le chunk `charts`, sous les limites.

**Écarts / retours ouverts** :

- `GET /api/documents/<id>` renvoie `document.to_dict(include_versions=True)` : `to_dict()`
  **n'expose pas `tags`**. Le schéma front est tolérant (`tags?`) et l'onglet étiquettes affiche
  « Aucune étiquette » en attendant ; si l'affichage des étiquettes sur la fiche est requis côté
  serveur, ligne backend candidate **R6‑03** (« ajouter `tags` à `document.to_dict()` »).
- L'API permissions ne définit pas d'action pour les étiquettes : l'UI rattache l'édition des
  étiquettes au droit `edit` (à confirmer si le backend ajoute une action dédiée).
- Avertissement React « clé manquante » détecté par les nouveaux tests dans `Header` → corrigé au
  passage (`Fragment` keyé par `item.path`).

### 13.5 F4 — Dépôt & versions ✅ (04/10/2026)

**Périmètre livré** :

- **Domaine `features/settings`** : `GET /api/settings/public` (zod en frontière, `staleTime` 5 min)
  alimente les écrans de dépôt en réglages serveur — taille max, extensions autorisées, OCR,
  scanner — avec valeurs de repli si l'endpoint est indisponible.
- **Domaine `features/documents` étendu** : `documentsApi.create` (`POST /documents` multipart,
  création + fichier → v1) et `documentsApi.addVersion` (`POST /documents/<id>/versions` → N+1),
  tous deux avec `onUploadProgress` (XHR) et `signal` (`AbortController`) ; hooks
  `useCreateDocument` / `useAddDocumentVersion` (invalidation documents + dossiers).
- **`lib/upload.js`** : `fileExtension`, `fileBaseName`, `validateFile` (contrôle **client**
  extension/taille, miroir du serveur mais jamais substitué : le backend reste l'autorité),
  `progressPercent`.
- **Écran de dépôt réel** : file d'attente bornée (`CONCURRENCY=2`), **refus avant envoi** des
  fichiers hors extension/taille, **progression réelle**, **annulation** (`AbortController`),
  **nouvelle tentative**, titre modifiable par fichier, **statut OCR** (`features.ocr_enabled`).
- **Métadonnées par API** (F4.4) : types (`/doc-types`), départements (`/departments`), dossiers
  (`/folders?view=tree`) ; niveau `confidential|secret` → **chiffrement au repos signalé**
  explicitement à l'utilisateur (bandeau).
- **Nouvelle version** : action « Nouvelle version » sur la fiche document (`rights.edit`), qui
  dépose `POST /documents/<id>/versions` et rafraîchit l'historique (acceptation F4).
- **Scanner** : le composant mocké est remplacé par un état **« non disponible »** honnête, piloté
  par `features.scanner_enabled` — plus aucun faux-positif ; l'onglet « Traitement par lot »
  redondant est supprimé (la file gère déjà le multi-fichiers).
- **`lib/api.js`** : suppression du `Content-Type` par défaut — axios pose `application/json` pour un
  objet et laisse le navigateur poser `multipart/form-data; boundary=…` pour un `FormData`.

**Preuves** : `npm run lint` → 0 · `npm test` → **93 verts** (dont `upload.test.js` ×7,
`useSettings.test.jsx` ×2, `useUpload.test.jsx` ×2, `DocumentUpload.test.jsx` ×2) · `tsc --noEmit` →
0 erreur · `npm run build` vert · `npm run size` → **151,18 kB** initial + **58,62 kB** chunk `charts`.

**Écarts / retours ouverts** :

- `GET /settings/public` n'expose **pas** `archives.allowed_confidentialities` : les quatre niveaux
  affichés sont une énumération miroir (`lib/formatters`) et le **défaut reste appliqué par le
  serveur** (champ omis si l'utilisateur ne choisit rien).
- `429` (30 req/min) traduit par `toAppError` (message générique) ; le backend ne renvoie pas de
  `Retry-After` exploité → pas de compte à rebours chiffré dans l'UI.
- OCR : l'extraction est **synchrone** dans `POST /documents` (P6) → le statut passe à « terminé » dès
  la réponse, sans polling.
- Chiffrement au repos effectif seulement si `FILE_ENCRYPTION_KEY` est posée côté serveur (P6).
- Le composant mock `BatchUploadManager` est supprimé ; la file réelle (`UploadProgress`) couvre le
  dépôt multiple.

### 13.6 F5 — Recherche ✅ (04/10/2026)

**Périmètre livré** :

- **Domaine `features/search`** : `searchApi.search` (`GET /search` — résultats, facettes, `engine`,
  `took_ms`), `history` (`GET /search/history`) et `clearHistory` (`DELETE`), validés par zod en
  frontière ; `urlState.js` (parse/sérialisation + `hasSearchCriteria`/`countActiveFilters`).
- **`lib/sanitize.js`** : l'extrait surligné est découpé en segments `{ text, highlight }` et rendu
  en vrais `<mark>` React — **jamais `dangerouslySetInnerHTML`** (A6).
- **Écran** — l'URL est la source unique de vérité (mots-clés, filtres, page) : **débounce 300 ms**
  de la frappe avant de pousser `q`, une URL copiée rouvre la même recherche. Indicateurs `took_ms`
  et `engine` affichés, pagination serveur.
- **Facettes** (`SearchFilters`) : statuts, types, départements, confidentialités renvoyés par l'API
  et cliquables (compteurs réels), synchronisés avec l'URL — aucun filtrage client.
- **Historique** (`SearchHistory`) : `GET /search/history` (dédupliqué) + vidage confirmé
  (`DELETE`), réutilisation d'une recherche passée (filtres `created_from/to` → `date_from/to`).
- **Limites** : un `429` (60/min, 120 admin) bascule l'affichage en **« recherche en pause »**
  plutôt qu'en erreur (F5.6).

**Preuves** : `npm run lint` → 0 · `npm test` → **107 verts** (dont `sanitize.test.js` ×4,
`features/search/urlState.test.js` ×5, `useSearch.test.jsx` ×3, `AdvancedSearch.test.jsx` ×2) ·
`tsc --noEmit` → 0 erreur · `npm run build` vert · `npm run size` → **151,37 kB** initial +
**58,62 kB** chunk `charts`.

**Écarts / retours ouverts** :

- **Recherches sauvegardées (F5.5)** : l'endpoint `GET/POST/DELETE /api/search/saved` (ligne
  **R6‑01**, prévu en **P7 backend**) n'est pas livré → le composant `SavedSearches` est
  **retiré** (feature masquée, décision Q6 = endpoint backend et non `localStorage`). À rebrancher
  quand R6‑01 arrive.
- L'historique stocke `created_from`/`created_to` ; la réutilisation les remappe sur
  `date_from`/`date_to`.
- Le moteur dépend du dialecte : `postgres_fulltext` en production, `sql_ilike` (extrait découpé)
  sur SQLite de dev/test.

### 13.7 F6 — Administration multi-campus ✅ (04/10/2026)

**Périmètre livré** :

- **Domaines F6** (api.js → hooks → index.js, zod en frontière Q2) : `campuses`
  (list/get/create/update/setStatus + institution + **store de périmètre** Zustand A4),
  `settings` (schéma/valeurs par campus/défauts/`PUT` en lot + public F4), `referentials`
  (**écriture admin** : départements, types, tags, rôles), `audit` (liste + export CSV),
  `retention` (statut/run/reports), `permissions` (grants document, révocations, `check`),
  `users` étendu (filtres serveur, statistiques, rapport d'import, URL d'export filtrée).
- **Campus (F6.1)** : CRUD complet, bascule d'activation confirmée (`409 campus_not_empty`
  traduit), tentative de suppression qui laisse le serveur refuser (`409`
  `campus_deletion_forbidden`) — **aucune suppression physique dans l'UI** (Q4).
- **Bandeau de périmètre (F6.2/A4)** : `CampusScopeBar` — sélecteur pour le super admin
  (« Tous les campus » inclus), libellé en lecture seule pour les autres rôles ; l'état vit
  dans `useCampusStore` (Zustand) et ne transmet `campus_id` **qu'aux endpoints qui
  l'acceptent** (réglages, audit, départements, rétention).
- **Réglages (F6.3)** : éditeur piloté par `GET /settings/schema` (type/choix/portée/aide),
  valeurs effectives par campus, `PUT` en lot en diff (`draft`), défauts du registre et aperçu
  public affichés ; onglet **Institution** (`GET/PUT /institution`).
- **Référentiels en écriture (F6.4)** : écran à 4 onglets (départements, types, étiquettes,
  rôles) — création/édition/suppression confirmée, conflits serveur traduits
  (`department_code_exists`, `department_not_empty`, `doc_type_in_use`, `tag_exists`,
  `role_exists`, `role_in_use`) ; départements filtrés par le périmètre de campus.
- **Utilisateurs complets (F6.5)** : pagination **serveur** et filtres (`search`, `role_id`,
  `department_id`, `is_active`) pilotés par l'URL (`urlState` + debounce 300 ms), formulaire
  complet (matricule, username, nom, email, rôle, département, **campus** pour un super admin
  — règle Q2, **mot de passe initial** optionnel avec les règles serveur en client), **soft
  delete** confirmé, `temporary_password` de la réinitialisation affiché en toast (M10 déjà
  clos, maintenu), **statistiques réelles** (`GET /users/statistics`), **import CSV avec
  rapport d'erreurs ligne à ligne** et export CSV filtré (`noopener`).
- **Actions groupées (F6.6)** : **masquées** — `POST /api/users/bulk` (R6‑02) non livré
  (décision Q7), plus aucun faux bouton.
- **Permissions (F6.7)** : écran d'accords par document — lecture
  (`GET /permissions/document/<id>/grants`), accord/révocation par utilisateur et par rôle
  (droits `view/download/edit/delete`), et outil de débogage `POST /permissions/check`
  (`allowed` + `reason`).
- **Audit (F6.8)** : écran filtré piloté par l'URL (`action`, `object_type`, `user_id`,
  `from/to`, `campus_id` super admin), pagination, export CSV ; **`ActivityPanel`** de la
  gestion des comptes branché sur `GET /dashboard/activity` (plus de données factices) et
  « Voir tout » vers `/audit`.
- **Rétention (F6.9)** : écran super admin — compteurs du statut, **simulation `dry_run`
  par défaut**, exécution réelle **doublement confirmée**, historique des rapports.
- **Espace Administration (Q9)** : menu « Administration » regroupé dans le `Header`
  (dropdown desktop + section mobile) ; **routes lazy** gardées (`RequireRole Admin` :
  utilisateurs, réglages, référentiels, permissions, audit ; `RequireScope` : campus,
  rétention) + `document.title` par route.
- **Primitives** : `Modal` réutilisable (tokens, tailles sm→xl) ; `Badge` partout (plus de
  classes de couleur dans les pages).
- **MSW + tests F6** : handlers campus/institution/réglages/référentiels CRUD/
  utilisateurs (write, stats, import/export)/audit/rétention/permissions ; 30 tests
  (`urlState` ×5, `useUsers` ×5, `useCampuses` ×4, `useAudit` ×3, `useRetention` ×4,
  `usePermissions` ×5, `useReferentials` ×4).

**Preuves** : `npm run lint` → 0 · `npx vitest run --maxWorkers=2` → **137 verts** (28
fichiers) · `tsc --noEmit` → 0 erreur · `npm run build` vert · `npm run size` →
**152,5 kB** initial + **58,62 kB** chunk `charts`, sous les limites. Gate A9 :
`grep mock src/pages` ne renvoie que des fichiers de test ; 0 `alert()`, 0 `window.location`.

**Écarts / retours ouverts** :

- **Accords dossier** : l'API d'écriture existe (`PUT/DELETE /permissions/folder/<id>/…`,
  hooks prêts dans `features/permissions`) mais **aucun endpoint de lecture**
  (`GET /permissions/folder/<id>/grants`) — un écran ne pourrait ni lister ni afficher les
  droits posés. Ligne backend candidate **R6‑04** ; en attendant, l'écran couvre les
  documents et l'outil `check` accepte `object: 'folder'`.
- **`GET /users` n'accepte pas de filtre `campus_id`** : la liste est bornée par le serveur
  selon l'acteur — le bandeau de périmètre est volontairement absent de cet écran (afficher
  un sélecteur non fonctionnel serait trompeur) ; le formulaire de création expose bien le
  `campus_id` (Q2).
- L'écran permissions opère par **identifiant de document** (saisi) : la découverte visuelle
  reste dans la bibliothèque/F3, dont la fiche affiche déjà les droits effectifs.
- `GET /settings/public` n'expose toujours pas `archives.allowed_confidentialities`
  (énumération miroir côté UI, cf. F4).
- R6‑01 (recherches sauvegardées) et R6‑02 (bulk utilisateurs) restent en attente P7.

**Versionnage** : branche `f6-administration` (`21d6dff` fondations, `e4b63a8` écrans)
fusionnée **`--no-ff`** dans la branche de base **`test`** le 05/10/2026 — merge commit
**`291417d`**, sans fast-forward. L'arbre fusionné est **identique** à celui de la branche F6
(les preuves ci-dessus s'appliquent telles quelles). **Aucun push** effectué à ce stade.

---

### 13.8 F7 — Accessibilité + e2e Playwright ✅ partiel (05/10/2026)

> Périmètre volontairement restreint aux items **2 et 3** de F7 (§6) : audit d'accessibilité et
> campagne e2e. i18n (F7.1), virtualisation (F7.4) et journal d'erreurs front (F7.5) **exclus** —
> F7 reste donc une sortie de phase **partielle**.

**Périmètre livré** :

- **Accessibilité (F7.2)** — `vitest-axe` en tests unitaires (décision : plutôt que
  `@axe-core/react`, inutile hors dev serveur) :
  - Helper `src/test/a11y.js` (`expectNoA11yViolations` via axe, matchers `vitest-axe/matchers`) ;
    règles désactivées : `color-contrast` (non applicable en jsdom, le contraste reste garanti par
    les tokens) et `region` (inadaptée aux fragments de page).
  - **8 tests a11y** sur les primitives (`accessibility.test.jsx`) : axe sur Button (icône /
    labellisé), Input (erreur reliée), Select (fermé/ouvert), Modal ; navigation clavier du Select
    (flèches/Home/End/Entrée/Échap) ; Modal (focus trap Tab/Shift-Tab, Échap, `aria-labelledby`,
    restauration du focus) ; SkipLink.
  - **Primitives durcies** : `Modal` réécrite (focus trap, focus initial, restauration, overlay
    `aria-hidden`) ; `Select` réécrit en `listbox`/`option` (`aria-selected`, `aria-expanded`,
    listbox nommée, select natif caché conservé pour le `name`) ; `Input` (`aria-invalid`,
    `aria-describedby` description + erreur `role=alert`) ; `Header` (menus `aria-haspopup` /
    `aria-expanded`, fermeture à Échap) ; `SkipLink` nouveau, branché dans `Routes.jsx`.
  - **Pages** : `id="main-content" tabIndex={-1}` sur les 13 `<main>` ; tableaux avec
    `caption` sr-only + `scope="col"` (et `aria-sort` sur les colonnes triables de la
    bibliothèque) ; **focus visible global** `:focus-visible { outline: var(--color-ring) }` —
    uniquement des tokens, **aucune couleur en dur** (règle `local/no-raw-colors` intacte).
- **E2E Playwright (F7.3)** — campagne sur la **stack docker réelle** (`docker compose up
--build`, aucun mock) :
  - `playwright.config.js` : testDir `e2e/`, **globalSetup** créant deux sessions persistées
    (admin + prof, code 2FA lu directement en base via `psql` — pas de SMTP en dev),
    `storageState` par rôle, workers 1, `channel: 'chrome'` (Chrome système — le téléchargement
    des navigateurs Playwright est inabordable dans cet environnement ; overridable via
    `E2E_CHANNEL=chromium`, `npm run e2e:install` pour les pipelines).
  - **11 tests verts** : fumée (session restaurée → dashboard, login + 2FA complet depuis
    l'état déconnecté, mauvais mot de passe reste sur /login) ; parcours Administration
    (utilisateurs, référentiels, audit, campus, rétention) ; **403** (redirection /forbidden
    **et** `GET /api/users` refusé pour un prof — A7 : le serveur fait foi) ; **413** (multipart
    51 Mo au-delà de la limite Nginx) ; **429** (rate-limit login, exécuté en dernier via
    préfixe `zz-`).
- **Correctif de bundle découvert par l'e2e** : le `manualChunks` de `vite.config.js` séparait
  `react` du reste du vendor ; Rollup hébergeait les helpers d'interop CJS de react dans l'autre
  chunk → **cycle d'initialisation inter-chunks** (crash prod `Cannot read properties of
undefined (reading 'forwardRef')`, page blanche — invisible en jsdom/Vitest). Corrigé en
  fusionnant `vendor-react` dans `vendor` (graphe vérifié acyclique : `vendor` ← `charts` /
  `vendor-query`). Bug **latent depuis F0** — première vraie exécution navigateur du build.
- **Outillage** : `@playwright/test@1.63` + scripts `e2e`/`e2e:headed`/`e2e:install`/`e2e:report` ;
  `size-limit` 12 → **13** (conflit peer `@size-limit/file` rendait `npm ci` impossible — ERESOLVE) ;
  override ESLint (globals node) pour `e2e/**` ; `.gitignore` (report/results/auth).

**Preuves** : `npm run lint` → 0 · `npx vitest run --maxWorkers=2` → **145 verts** (29 fichiers,
dont 8 a11y) · `tsc --noEmit` → 0 · `npm run build` vert · `npm run size` → **151,6 kB** initial

- **58,4 kB** chunk `charts` · **`npx playwright test` → 11 verts** (29,6 s) sur
  `docker compose up --build` (db/redis/backend/frontend sains, seed démo).

**Écarts / retours ouverts** :

- **i18n (F7.1) non faite** : le sélecteur de langue du login reste cosmétique (aucune traduction
  chargée) — repoussée, décision à trancher (FR seul vs FR/EN avec `i18next`). Virtualisation
  (F7.4) et journal d'erreurs front (F7.5) non faits.
- axe tourne en **jsdom** : le contraste (`color-contrast`) n'y est pas vérifiable — un passage
  `axe` sur le build réel (CLI ou extension) reste possible en complément, la garantie tokens
  AA restant assumée par le design system.
- **Chrome système requis** pour l'e2e dans cet environnement (`channel: 'chrome'` par défaut) :
  un pipeline sans Chrome desktop devra d'abord exécuter `npm run e2e:install`.
- Le crash de bundle montrait l'absence d'exécution navigateur du build prod depuis F0 : couvert
  désormais par la fumée e2e dès le premier test.

**Versionnage** : branche `f7-durcissement` (`0560d59` a11y, `3bf8299` e2e + fix bundle)
fusionnée **`--no-ff`** dans `test` le 05/10/2026 — merge commit **`dfbc488`**. **Aucun push**
effectué à ce stade.

---

## Annexe A — Arborescence cible (résumé des dépendances)

```
main.jsx
└── app/providers.jsx  (Query · Toast · Theme · i18n)
    └── app/router.jsx (lazy + RequireAuth/Role/Scope)
        ├── pages/*            ← composition uniquement (aucun axios)
        ├── components/ui|layout  ← primitives sans domaine
        ├── features/*         ← api.js → use*.js → index.js (surface)
        └── lib/*              ← api, errors, queryKeys, sanitize, formatters, i18n, schema
```

Sens des flèches imposé par **ESLint** : `pages → features → lib`, `features ↛ pages`,
`lib ↛ features`.

---

## Annexe B — Ordre d'exécution recommandé (résumé visuel)

```
F0 fondations (lint · tests · codegen · lazy · gardes · erreurs · CI · README)
 ├── F1 session & compte ──────────────┐
 ├── F2 dashboard & notifications ─────┤ indépendantes (parallelisables)
 ├── F3 bibliothèque & structure ──────┤
 │    └── F4 dépôt & versions ────────┤
 │    └── F5 recherche ───────────────┤
 └── F6 administration multi-campus ←─┘ (dépend de F1‑F5)
      └── F7 durcissement (optionnel) : i18n · a11y · e2e étendu
```

_Chaque phase = une branche `fN-…` → tests verts → `merge --no-ff` → mise à jour de ce document
(cases cochées + §13) → commit `docs(assets): …` dans le dépôt racine._
