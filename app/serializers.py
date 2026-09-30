"""
Helpers de sérialisation et de pagination (plan 07 — P0.5).

Contrat (D8) :

* succès          : `{…champs…}` (plus `message` si fourni) ;
* liste paginée   : `{items: [...], page, per_page, total, pages}` ;
* erreurs         : `app.errors.error_response()` → `{"error", "code", "details"}`.

Les modèles exposent déjà `to_dict()` ; ces helpers garantissent qu'**aucune**
nouvelle route ne renvoie de JSON brut (objet ORM, tuple, None) et que toutes
les listes partagent la même pagination.

NB rétro-compatibilité : `GET /api/users` conserve `{users, current_page, …}`
(D8). Les **nouveaux** endpoints utilisent `paginate()` / `paginated()`.
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from flask import jsonify

DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


# ---------------------------------------------------------------------------
# Réponses de succès
# ---------------------------------------------------------------------------

def ok(data: Any = None, message: str | None = None, status: int = 200):
    """
    Enveloppe de succès.

    `data` :
    * dict  → ses paires sont fusionnées au niveau racine (contrat actuel) ;
    * autre → rangé sous la clé `data`.
    """
    body: dict[str, Any] = {}
    if data is not None:
        if isinstance(data, Mapping):
            body.update(data)
        else:
            body['data'] = data
    if message:
        body['message'] = message
    return jsonify(body), status


def serialize(obj: Any) -> Any:
    """`to_dict()` si disponible, sinon l'objet lui-même (dict / scalaire)."""
    to_dict = getattr(obj, 'to_dict', None)
    if callable(to_dict):
        return to_dict()
    return obj


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def parse_pagination(args: Mapping[str, Any], default_per_page: int = DEFAULT_PER_PAGE
                     ) -> tuple[int, int]:
    """
    Lit `page` / `per_page` dans `request.args` en bornant les valeurs.

    `page` ≥ 1, `1 ≤ per_page ≤ MAX_PER_PAGE` : une valeur absurde ne casse
    jamais la liste (erreur 400 pénible pour l'utilisateur).
    """
    try:
        page = int(args.get('page', 1) or 1)
    except (TypeError, ValueError):
        page = 1
    try:
        per_page = int(args.get('per_page', default_per_page) or default_per_page)
    except (TypeError, ValueError):
        per_page = default_per_page

    return max(page, 1), min(max(per_page, 1), MAX_PER_PAGE)


def pagination_dict(items: Iterable[Any], total: int, page: int, per_page: int,
                    key: str = 'items') -> dict:
    """Corps JSON de la pagination (sérialise chaque élément via `to_dict()`)."""
    per_page = max(int(per_page), 1)
    items = [serialize(item) for item in items]
    return {
        key: items,
        'page': page,
        'per_page': per_page,
        'total': total,
        'pages': max((total + per_page - 1) // per_page, 1),
    }


def paginated(items: Iterable[Any], total: int, page: int = 1,
              per_page: int = DEFAULT_PER_PAGE, key: str = 'items'):
    """`pagination_dict()` livré comme réponse Flask : `(jsonify, 200)`."""
    return jsonify(pagination_dict(items, total, page, per_page, key)), 200


def paginate(query: Any, page: int = 1, per_page: int = DEFAULT_PER_PAGE,
             key: str = 'items') -> dict:
    """
    Applique la pagination à une query Flask-SQLAlchemy et renvoie l'enveloppe.

        return paginate(UserAccount.query, **parse_pagination(request.args))

    `error_out=False` : une page hors bornes renvoie une liste vide plutôt
    qu'une erreur 404 (comportement attendu d'une liste côté UI).
    """
    page, per_page = max(page, 1), min(max(per_page, 1), MAX_PER_PAGE)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return pagination_dict(pagination.items, pagination.total,
                           pagination.page, pagination.per_page, key)
