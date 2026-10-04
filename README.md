# UniArchive — Frontend

Interface d'administration d'archives universitaires multi-campus, branchée sur l'API
Flask du dépôt `backend/`.

## Stack

React 19 · Vite 7 · React Router 7 · TanStack Query 5 · Zustand 5 · Tailwind 4 ·
react-hook-form · recharts/d3 · framer-motion · lucide-react · **zod** (validation runtime).

## Démarrage

```bash
npm install
cp .env.example .env        # VITE_API_URL pointe sur l'API
npm run dev                 # http://localhost:5173
```

Le backend doit être joignable (proxy même origine en Docker ; en dev, CORS autorise
`localhost:5173`). Pour une stack complète :

```bash
cd .. && docker compose up --build
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (`dist/`) |
| `npm run lint` | ESLint — **0 erreur** attendu (dont la règle maison anti-couleurs) |
| `npm test` | Tests Vitest + React Testing Library + MSW |
| `npm run typecheck` | `tsc --noEmit` (TypeScript progressif) |
| `npm run size` | Budget de bundle (≤ 200 ko gzip sur le JS initial) |
| `npm run codegen` | Régénère `src/lib/schema/api.d.ts` depuis `/api/openapi.json` |

## Architecture (feature-sliced)

```
src/
├── app/            providers (Query, Toast, Confirm), queryClient
├── lib/            socle transverse : api, errors, validate (zod), formatters, queryKeys
├── components/
│   ├── ui/         primitives sans domaine (Button, Input, Select, Badge, Card, Toast…)
│   └── layout/     Header, Breadcrumb
├── features/       un domaine métier par dossier : api.js, use*.js, types.js, index.js
│   ├── auth/       session, gardes, permissions
│   └── users/      comptes, rôles, départements
├── pages/          composition d'écran (aucun appel axios direct)
├── mocks/          handlers MSW (tests uniquement)
└── styles/         index.css — source unique des tokens de couleur
```

**Sens des dépendances** : `pages → features → lib`. Jamais l'inverse.

## Conventions

- **Aucune couleur codée en dur** : uniquement des tokens (`bg-primary`, `text-error`,
  `border-border`). La règle ESLint `local/no-raw-colors` refuse `bg-blue-500`, `bg-[#fff]`
  et la prop JSX `color`. Icônes colorées via `className` (`text-primary-foreground`).
- **Données serveur = TanStack Query** ; Zustand uniquement pour l'état client.
- **Validation runtime** : chaque réponse d'API passe par un schéma zod (`lib/validate`).
- **Erreurs** : traduites une seule fois dans `lib/errors` (code stable → message FR + action).
- **Aucun `alert()` / `window.confirm()`** : `useToast()` et `useConfirm()`.
- **Navigation** : `useNavigate()` (jamais `window.location`), `document.title` par route.

## Tests

Les tests utilisent **MSW** : aucune requête réseau réelle. Les fixtures vivent dans
`src/mocks/handlers.js` et chaque test peut les surcharger avec `server.use(...)`.

```bash
npm test
```