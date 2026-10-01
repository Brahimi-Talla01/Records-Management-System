"""
Performance §7.5.4 (P6 du plan 07) : plan d'exécution et pagination clé.

`flask perf explain` est exécuté sur SQLite en test (`EXPLAIN QUERY PLAN`) :
les dix requêtes suivies doivent produire un plan sans erreur. La pagination
clé est vérifiée en parcourant une liste complète page par page (ordre identique
à la pagination d'origine, aucune ligne en double) et en écoutant le SQL émis
pour constater l'absence de `COUNT(*)`.

La branche plein texte n'existe que sur PostgreSQL : elle est couverte ici en
compilant les requêtes pour le dialecte `postgresql` (sans serveur), ce qui
attrape les défauts de rendu littéral et de cache que SQLite ne voit jamais.
"""

import json
import warnings

import pytest
from sqlalchemy import event, select
from sqlalchemy.dialects import postgresql

import sqlalchemy.dialects.postgresql.ext  # noqa: F401 — enregistre websearch_to_tsquery

from app.models.document import Document
from app.search.services import SearchService
from app.services.perf_service import explain, heavy_queries
from extensions import db

NB_DOCUMENTS = 7


@pytest.fixture
def seeded_documents(app, admin):
    """Documents créés par l'API (les seeds éventuels sont comptés aussi)."""
    with app.app_context():
        from app.models.campus import Campus
        from app.models.doc_type import DocType
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        doc_type = DocType.query.first()
        assert campus is not None and doc_type is not None
        campus_id, doc_type_id = campus.campus_id, doc_type.doc_type_id

    ids = []
    for index in range(NB_DOCUMENTS):
        response = admin.post('/api/documents', data={
            'title': f'Rapport {index:02d}',
            'doc_type_id': str(doc_type_id),
            'campus_id': str(campus_id),
        }, content_type='multipart/form-data')
        assert response.status_code == 201, response.get_json()
        ids.append(response.get_json()['document_id'])
    return ids


def _walk_keyset(admin, per_page=3):
    """Parcourt toute la liste en clé-pagination, page par page."""
    pages, cursor = [], None
    for _ in range(50):
        params = {'pagination': 'keyset', 'per_page': per_page}
        if cursor:
            params['cursor'] = cursor
        page = admin.get('/api/documents', query_string=params)
        assert page.status_code == 200, page.get_json()
        payload = page.get_json()
        pages.append(payload)
        if not payload['has_more']:
            assert payload['next_cursor'] is None
            return pages
        cursor = payload['next_cursor']
    pytest.fail('pagination clé sans fin (boucle détectée)')


def test_explain_couvre_les_dix_requetes_sans_erreur():
    report = explain()

    assert len(report) == 10
    assert [entry['query'] for entry in report] == \
        [name for name, _ in heavy_queries()]
    failures = [entry for entry in report if entry.get('error')]
    assert not failures, failures
    assert all(entry['plan'] for entry in report)


def test_commande_perf_explain(app):
    result = app.test_cli_runner().invoke(args=['perf', 'explain'])

    assert result.exit_code == 0, result.output
    assert '10 requêtes, 0 erreur(s)' in result.output
    assert 'documents : listing par campus et statut' in result.output


def test_commande_perf_explain_json(app):
    result = app.test_cli_runner().invoke(args=['perf', 'explain', '--json'])

    assert result.exit_code == 0, result.output
    payload = json.loads(result.output)
    assert len(payload) == 10
    assert all(entry['plan'] and not entry.get('error') for entry in payload)


def test_requetes_postgres_compilables_en_litteraux(monkeypatch):
    """`literal_binds` (la technique de l'EXPLAIN) doit rendre les 10 requêtes
    pour PostgreSQL : `websearch_to_tsquery('french')` posait un littéral
    REGCONFIG sans processeur — les 2 requêtes plein texte échouaient en PG."""
    monkeypatch.setattr(SearchService, 'is_postgres', lambda: True)
    dialect = postgresql.dialect()

    for name, statement in heavy_queries():
        compiled = statement.compile(dialect=dialect,
                                     compile_kwargs={'literal_binds': True})
        assert compiled.string, name


def test_requete_full_text_sans_avertissement_de_cache(monkeypatch):
    """`search_vector` (TSVector) doit déclarer `cache_ok` : sinon SQLAlchemy
    refuse la clé de cache et recompile la requête plein texte à chaque appel."""
    monkeypatch.setattr(SearchService, 'is_postgres', lambda: True)
    condition, _, _ = SearchService._text_condition('rapport')

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        select(Document).where(condition).limit(20)._generate_cache_key()

    missing = [str(w.message) for w in caught if 'cache key' in str(w.message)]
    assert not missing, missing


def test_pagination_cle_restitue_la_meme_liste(app, admin, seeded_documents):
    offset = admin.get('/api/documents',
                       query_string={'per_page': 100}).get_json()
    expected = [item['document_id'] for item in offset['items']]
    assert set(seeded_documents) <= set(expected)

    collected = []
    pages = _walk_keyset(admin)
    for page in pages:
        assert 'total' not in page and 'page' not in page
        assert page['per_page'] == 3
        collected.extend(item['document_id'] for item in page['items'])

    assert collected == expected
    assert len(collected) == len(set(collected))


def test_pagination_cle_sans_comptage(admin, seeded_documents):
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement.lower())

    engine = db.engine
    event.listen(engine, 'before_cursor_execute', record)
    try:
        keyset = admin.get('/api/documents',
                           query_string={'pagination': 'keyset',
                                         'per_page': 3})
        assert keyset.status_code == 200
        assert not any('count(' in sql for sql in statements)

        statements.clear()
        offset = admin.get('/api/documents', query_string={'per_page': 3})
        assert offset.status_code == 200
        assert any('count(' in sql for sql in statements)
    finally:
        event.remove(engine, 'before_cursor_execute', record)


def test_pagination_cle_en_ordre_croissant(app, admin, seeded_documents):
    pages = []
    cursor = None
    for _ in range(50):
        params = {'pagination': 'keyset', 'per_page': 4, 'order': 'asc'}
        if cursor:
            params['cursor'] = cursor
        page = admin.get('/api/documents', query_string=params).get_json()
        pages.append(page)
        if not page['has_more']:
            break
        cursor = page['next_cursor']

    collected = [item['document_id'] for page in pages for item in page['items']]
    reference = admin.get('/api/documents',
                          query_string={'per_page': 100, 'order': 'asc'}
                          ).get_json()['items']
    assert collected == [item['document_id'] for item in reference]


def test_pagination_cle_invalide_si_tri_change(admin, seeded_documents):
    """Changer de tri en cours de parcours invalide le curseur (400)."""
    first = admin.get('/api/documents',
                      query_string={'pagination': 'keyset', 'per_page': 3}
                      ).get_json()
    assert first['next_cursor'] is not None

    changed = admin.get('/api/documents', query_string={
        'pagination': 'keyset', 'per_page': 3, 'sort': 'title',
        'cursor': first['next_cursor'],
    })

    assert changed.status_code == 400
    assert changed.get_json()['code'] == 'cursor_invalid'


def test_pagination_cle_refuse_une_colonne_nullable(admin):
    response = admin.get('/api/documents', query_string={
        'pagination': 'keyset', 'sort': 'size_bytes'})

    assert response.status_code == 400
    assert response.get_json()['code'] == 'cursor_unsupported_sort'


def test_pagination_cle_refuse_un_jeton_invalide(admin):
    response = admin.get('/api/documents', query_string={
        'pagination': 'keyset', 'cursor': 'pas-du-base64!!'})

    assert response.status_code == 400
    assert response.get_json()['code'] == 'cursor_invalid'


def test_pagination_inconnue_rejetee(admin):
    response = admin.get('/api/documents', query_string={'pagination': 'toc'})

    assert response.status_code == 400
    assert response.get_json()['code'] == 'invalid_pagination'


def test_pagination_offset_conserve_son_contrat(app, admin, seeded_documents):
    payload = admin.get('/api/documents',
                        query_string={'page': 1, 'per_page': 3}).get_json()

    assert payload['page'] == 1
    assert payload['per_page'] == 3
    assert payload['total'] == len(seeded_documents)
    assert payload['pages'] == 3
    assert len(payload['items']) == 3
