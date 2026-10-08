# UniArchive — Présentation du projet

> Document d'audit n°1/4 — voir aussi : [02_architecture_technique.md](02_architecture_technique.md) · [03_etat_avancement.md](03_etat_avancement.md) · [04_analyse_recommandations.md](04_analyse_recommandations.md)

---

## 1. Objectif du produit

UniArchive est un **outil interne de gestion des archives numériques** destiné aux établissements d'enseignement supérieur. Il vise à remplacer la gestion documentaire dispersée (disques durs partagés, papier, e-mails) par une plateforme centralisée, sécurisée et traçable :

- **Centralisation** : tous les documents académiques et administratifs dans une bibliothèque unique, organisée par dossiers, départements, types et tags.
- **Conformité** : durées de conservation (`retention_period`), niveaux de confidentialité, journal d'audit complet (`AuditLog`), traçabilité des connexions et des actions.
- **Sécurité d'accès** : authentification à deux facteurs (2FA), rôles, droits fins par utilisateur et par rôle sur les dossiers et documents.
- **Recherche** : recherche avancée multi-critères avec historique des recherches (`SearchHistory`).

## 2. Cible commerciale

| Segment                                          | Besoin type                                                      | Taille           |
| ------------------------------------------------ | ---------------------------------------------------------------- | ---------------- |
| Universités et grandes écoles privées            | Volumétrie élevée, multi-facultés/départements, conformité forte | Grande           |
| Instituts privés d'enseignement supérieur (IPES) | Gestion des dossiers étudiants, thèses, mémoires                 | Moyenne          |
| Centres de formation professionnelle             | Simplicité, onboarding rapide, archives administratives          | Moyenne à grande |

## 3. Positionnement (d'après l'analyse du code)

- **Produit SaaS multi-établissements en devenir** : le modèle de données actuel (rôles, départements, dossiers arborescents, droits granulaires) est conçu pour **un seul établissement**. La location (multi-tenant) n'existe pas encore — c'est le chantier structurant pour vendre à plusieurs écoles (voir doc n°4).
- **Différenciateurs prévus dans le code** : OCR sur les documents uploadés (champ `ocr_text`, option OCR dans l'écran d'upload), numérisation scanner (`ScannerIntegration.jsx`), gestion des versions de documents (`DocumentVersion`), alertes de sécurité (`SecurityAlert`), import/export CSV des utilisateurs.
- **Langue** : interface en français (marché francophone d'Afrique et d'Europe visiblement visé — branding « Université de Douala » sur la page de connexion).
- **Conformité affichée** : mention « Conforme RGPD » dans le footer du dashboard — à confirmer juridiquement avant toute vente.

## 4. État commercial actuel (résumé honnête)

| Élément                                         | État                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Maquettes / écrans UI                           | ✅ Complets (6 écrans), design soigné                                                                                         |
| Authentification + 2FA + reset password         | ✅ Fonctionnel de bout en bout (session HTTPOnly + CSRF, rate limiting)                                                       |
| Gestion des utilisateurs                        | ✅ Backend complet **et** frontend branché (TanStack Query : CRUD, import/export CSV, rôles, départements)                     |
| Documents (upload, stockage, recherche, droits) | ❌ Modèles DB créés, blueprints enregistrés mais **stubs** (« module OK »), aucun fichier réellement stocké                   |
| Tableau de bord / statistiques                  | 🟡 Utilisateur/rôle réels (`GET /auth/me`), mais statistiques et documents récents encore mockés ; blueprint stub             |
| Déployabilité                                   | ✅ [Docker Compose](06_dockerisation.md) (PostgreSQL + Redis + gunicorn + Nginx) + `.env.example` + CI GitHub Actions (`ruff` + `pyright` + `pytest` sur SQLite/PostgreSQL/Redis + `docker build`) et 100 tests pytest |

**Verdict** : le projet est à mi-chemin entre le prototype validé (UX + auth + CRUD utilisateurs) et le produit vendable (le cœur métier « document » reste à construire côté API). Le parcours recommandé est détaillé dans [04_analyse_recommandations.md](04_analyse_recommandations.md).
