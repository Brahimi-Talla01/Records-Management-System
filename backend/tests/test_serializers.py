"""
Sérialiseurs et pagination partagés (plan 07 — P0.5).

Contrat D8 : `{items, page, per_page, total, pages}` + jamais de JSON brut.
"""

from app.models.user import UserAccount
from app.serializers import (
    DEFAULT_PER_PAGE,
    MAX_PER_PAGE,
    ok,
    paginated,
    pagination_dict,
    paginate,
    parse_pagination,
    serialize,
)


# ---------------------------------------------------------------------------
# parse_pagination
# ---------------------------------------------------------------------------


def test_parse_pagination_par_defaut():
    assert parse_pagination({}) == (1, DEFAULT_PER_PAGE)


def test_parse_pagination_lit_les_parametres():
    assert parse_pagination({'page': '3', 'per_page': '50'}) == (3, 50)


def test_parse_pagination_borne_les_valeurs_absurdes():
    assert parse_pagination({'page': '-7', 'per_page': '0'}) == (1, 1)
    assert parse_pagination({'per_page': '100000'}) == (1, MAX_PER_PAGE)


def test_parse_pagination_valeurs_non_numeriques():
    assert parse_pagination({'page': 'abc', 'per_page': 'xyz'}) == (1, DEFAULT_PER_PAGE)
    assert parse_pagination({'page': None, 'per_page': None}) == (1, DEFAULT_PER_PAGE)


# ---------------------------------------------------------------------------
# serialize / ok
# ---------------------------------------------------------------------------


def test_serialize_modele_dict_et_scalaire():
    user = UserAccount(username='jean', matricule='J1', password_hash='x')

    assert serialize(user)['username'] == 'jean'
    assert serialize({'a': 1}) == {'a': 1}
    assert serialize(42) == 42


def test_ok_fusionne_les_dictionnaires():
    resp, status = ok({'users': [], 'total': 0})

    assert status == 200
    assert resp.get_json() == {'users': [], 'total': 0}


def test_ok_avec_message_et_objet():
    resp, status = ok('enregistre', message='Créé avec succès')

    assert status == 200
    assert resp.get_json() == {'data': 'enregistre', 'message': 'Créé avec succès'}


def test_ok_sans_donnees():
    resp, status = ok()

    assert status == 200
    assert resp.get_json() == {}


# ---------------------------------------------------------------------------
# pagination
# ---------------------------------------------------------------------------


def test_pagination_dict_calcule_les_pages():
    body = pagination_dict(['a', 'b'], total=45, page=2, per_page=20)

    assert body == {
        'items': ['a', 'b'],
        'page': 2,
        'per_page': 20,
        'total': 45,
        'pages': 3,
    }


def test_pagination_dict_vide_au_moins_une_page():
    body = pagination_dict([], total=0, page=1, per_page=20)

    assert body['items'] == []
    assert body['pages'] == 1  # pas de division par zéro côté UI


def test_pagination_dict_cle_personnalisee():
    body = pagination_dict([], total=0, page=1, per_page=20, key='notifications')

    assert list(body)[0] == 'notifications'


def test_paginate_sur_une_query(app):
    body = paginate(UserAccount.query, page=1, per_page=10)

    assert body['total'] == 4
    assert body['page'] == 1
    assert body['per_page'] == 10
    assert body['pages'] == 1
    assert {item['username'] for item in body['items']} == {
        'admin', 'prof', 'secretaire', 'etudiant',
    }


def test_paginate_page_hors_bornes_renvoie_une_liste_vide(app):
    body = paginate(UserAccount.query, page=999, per_page=10)

    assert body['items'] == []
    assert body['total'] == 4
    assert body['page'] == 999


def test_paginate_borne_per_page(app):
    assert paginate(UserAccount.query, page=1, per_page=9999)['per_page'] == MAX_PER_PAGE


def test_paginated_renvoie_une_reponse_http(app):
    resp, status = paginated([], total=0, page=1, per_page=20)

    assert status == 200
    assert resp.mimetype == 'application/json'
    assert resp.get_json()['total'] == 0
