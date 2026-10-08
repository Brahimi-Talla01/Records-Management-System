# Gestion des archives

> Application web de gestion et de consultation d'archives — monorepo backend + frontend.

**Auteur** : Ibrahim Talla · **Statut** : en développement actif

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Structure du dépôt](#structure-du-dépôt)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Développement](#développement)
- [Tests](#tests)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Workflow Git](#workflow-git)
- [Licence](#licence)

---

## Présentation

**Gestion des archives** est une application web qui permet de centraliser, indexer et consulter des documents archivés. Elle se compose de deux applications indépendantes, versionnées dans un seul dépôt :

- un **backend Flask** exposant une API REST ;
- un **frontend JavaScript** (Vite) consommant cette API.

Le dépôt suit une organisation _monorepo_ : un seul historique Git, une seule politique de versionnement, un seul point d'entrée pour l'installation.

---

## Fonctionnalités

| Domaine          | Fonctionnalité                                                    |
| ---------------- | ----------------------------------------------------------------- |
| Authentification | Bootstrap d'un super-administrateur via variables d'environnement |
| Archives         | Dépôt, indexation et téléchargement de documents                  |
| Recherche        | Recherche plein-texte dans le centre d'aide et les archives       |
| Administration   | Gestion des utilisateurs et des rôles                             |
| Aide             | Centre d'aide intégré (`/help`) accessible depuis la navigation   |
| Démonstration    | Jeu de données de démonstration chargé au premier démarrage       |

---

## Stack technique

### Backend

- **Python 3.11+**
- **Flask** - framework web
- **SQLAlchemy** - ORM
- **Alembic** — migrations de base de données
- **Pytest** — tests unitaires et d'intégration
- **Ruff** / **MyPy** — lint et typage statique

### Frontend

- **JavaScript (ES2022+)**
- **Vite** — bundler et serveur de développement
- **Playwright** — tests end-to-end

### Infrastructure

- **Docker** & **Docker Compose** — orchestration locale
- **PostgreSQL** — base de données

---

## Structure du dépôt

.
├── assets/ # Documentation projet (audit, plan, prompts, diagrammes)
├── backend/ # Application Flask
│ ├── app/ # Code source
│ ├── migrations/ # Migrations Alembic
│ ├── tests/ # Tests Pytest
│ ├── pyproject.toml
│ └── .gitignore
├── frontend/ # Application Vite
│ ├── src/
│ ├── e2e/ # Tests Playwright
│ ├── public/
│ ├── package.json
│ └── .gitignore
├── docker-compose.yml # Orchestration locale
├── .gitignore # Ignore global du monorepo
└── README.md

text

> Ce dépôt est un **monorepo** : `backend/` et `frontend/` n'ont pas de `.git` propre. Tout l'historique est centralisé ici.

---

## Prérequis

| Outil          | Version minimale | Vérification             |
| -------------- | ---------------- | ------------------------ |
| Docker         | 24+              | `docker --version`       |
| Docker Compose | v2               | `docker compose version` |
| Python         | 3.11+            | `python3 --version`      |
| Node.js        | 20+              | `node --version`         |
| Git            | 2.40+            | `git --version`          |

Pour un démarrage **sans Docker**, il faut en plus :

- `pip` ou `uv` (gestion des dépendances Python)
- `npm` ou `pnpm`

---

## Démarrage rapide

### Avec Docker (recommandé)

```bash
git clone https://github.com/<compte>/<nom-du-repo>.git
cd <nom-du-repo>
docker compose up --build
L'application est alors accessible sur :

Frontend : http://localhost:5173

Backend (API) : http://localhost:5000

Documentation API : <!-- À ADAPTER si tu exposes Swagger/Redoc -->

Des données de démonstration sont chargées automatiquement au premier démarrage.

Pour arrêter :

bash
docker compose down
Pour repartir d'une base propre :

bash
docker compose down -v
Sans Docker
Backend :

bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt      # ou : pip install -e .
flask --app app run --debug
Frontend (dans un second terminal) :

bash
cd frontend
npm install
npm run dev
Développement
Backend
bash
cd backend
source venv/bin/activate

# Lancer les migrations
alembic upgrade head

# Démarrer en mode debug
flask --app app run --debug
Frontend
bash
cd frontend
npm run dev          # serveur de développement Vite
npm run build        # build de production
npm run preview      # prévisualisation du build
Qualité de code
bash
# Backend
cd backend
ruff check .
mypy app/

# Frontend
cd frontend
npm run lint
Tests
Backend — Pytest
bash
cd backend
source venv/bin/activate
pytest                    # suite complète
pytest tests/unit/        # tests unitaires
pytest tests/integration/ # tests d'intégration
pytest --cov=app          # avec couverture
Frontend — Playwright
bash
cd frontend
npx playwright install    # installation initiale des navigateurs
npm run test:e2e          # suite end-to-end
Configuration
Les variables d'environnement sont lues depuis un fichier .env à la racine (non versionné).

Un modèle est fourni :

bash
cp .env.example .env
Variables principales :

Variable	Rôle	Exemple
DATABASE_URL	Chaîne de connexion à la base	postgresql://user:pass@db:5432/archives
SECRET_KEY	Clé de signature des sessions Flask	change-me-in-production
SUPER_ADMIN_EMAIL	Email du super-admin bootstrapé au démarrage	admin@example.com
SUPER_ADMIN_PASSWORD	Mot de passe du super-admin	strong-password
VITE_API_URL	URL de l'API côté frontend	http://localhost:5000
⚠️ Aucun secret ne doit être commité. Le fichier .env est ignoré par Git ; les secrets de production sont injectés par l'environnement d'exécution.

Documentation
La documentation projet est centralisée dans assets/ :

Fichier	Contenu
assets/PLAN_EPREUVE.md	Plan d'implémentation et suivi d'avancement
assets/*.pdf	Documents sources (sujet, cahier des charges, audit)
assets/diagrammes/	Diagrammes d'architecture (Mermaid / PlantUML)


Workflow Git
Convention de branches
Type	Format	Exemple
Fonctionnalité	feature/<slug>	feature/recherche-aide
Correction	fix/<slug>	fix/upload-corps-vide
Documentation	docs/<slug>	docs/maj-architecture
Tâche technique	chore/<slug>	chore/upgrade-vite
Convention de commits
Les messages suivent la spécification Conventional Commits :

text
<type>(<scope>): <description courte>

<corps optionnel — pourquoi, pas comment>

<référence issue — ex. Closes #12>
Types acceptés : feat, fix, docs, style, refactor, test, chore, perf.

Scopes suggérés : backend, frontend, api, db, ci, docs.

Exemples :

text
feat(backend): endpoint POST /api/archives - Closes #8
fix(frontend): téléchargement au corps vide - Closes #15
docs(readme): ajout de la section workflow Git
chore(deps): mise à jour Vite vers 5.4
Processus
Créer une branche depuis main.

Développer avec des commits atomiques.

Ouvrir une pull request vers main.

Fusionner après revue (ou après validation des tests en solo).

La branche main doit rester saine à tout moment : elle doit toujours builder.
```
