"""
Connexion à la base et intégrité du schéma (plan07 — P0.3).

Remplace l'ancien script `tests/test_db_connection.py` qui se contentait
d'imprimer l'URL et le nombre de tables.
"""

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app import seeds
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.folder import Folder
from app.models.role import Role
from app.models.tag import Tag
from app.models.user import UserAccount
from extensions import db

EXPECTED_TABLES = {
    'audit_log', 'department', 'doc_type', 'document', 'document_tag',
    'document_version', 'folder', 'notification', 'password_reset_token',
    'role', 'role_document_right', 'role_folder_right', 'search_history',
    'security_alert', 'tag', 'two_factor_code', 'user_account',
    'user_document_right', 'user_folder_right',
}


def test_connexion_operatoire(app):
    with app.app_context():
        assert db.session.execute(text('SELECT 1')).scalar() == 1
        assert db.engine.url.drivername.startswith('sqlite')


def test_le_schema_comporte_toutes_les_tables(app):
    with app.app_context():
        tables = set(inspect(db.engine).get_table_names())

    assert tables == EXPECTED_TABLES


def test_roles_et_departements_amorcés_par_les_seeds(app):
    with app.app_context():
        assert Role.query.count() == 4
        assert Department.query.count() == 4
        assert DocType.query.count() == 6
        assert Folder.query.count() == 4
        assert UserAccount.query.count() == 4  # admin + 3 comptes démo


def test_cree_une_ligne_et_se_sérialise(app):
    """Création d'un document avec toutes ses relations + sérialisation."""
    with app.app_context():
        user = UserAccount.query.filter_by(username='admin').first()
        doc_type = DocType.query.filter_by(name='Rapport').first()
        folder = Folder.query.filter_by(name='Archives Académiques').first()
        assert user is not None and doc_type is not None and folder is not None
        tag = Tag(name='soutenance')
        db.session.add(tag)

        document = Document(
            title='Rapport de stage — test',
            description='Document créé par la suite de tests',
            doc_type_id=doc_type.doc_type_id,
            department_id=user.department_id,
            folder_id=folder.folder_id,
        )
        document.tags.append(tag)
        version = DocumentVersion(
            version_number=1,
            storage_url='uploads/test/rapport.pdf',
            mime_type='application/pdf',
            checksum='a' * 64,
            document=document,
            uploaded_by=user.user_id,
        )
        db.session.add_all([document, version])
        db.session.commit()

        # On sort les valeurs (int / dict) DU CONTEXTE : hors de celui-ci, les
        # instances sont détachées et leurs attributs inaccessibles.
        document_id = document.document_id
        doc_type_id = doc_type.doc_type_id
        folder_id = folder.folder_id
        department_id = user.department_id
        payload = document.to_dict(include_versions=True)

    assert payload['document_id'] == document_id
    assert payload['title'] == 'Rapport de stage — test'
    assert payload['doc_type_id'] == doc_type_id
    assert payload['folder_id'] == folder_id
    assert payload['department_id'] == department_id
    assert [v['version_number'] for v in payload['versions']] == [1]


def test_cle_etrangere_manquante_rejetée(app):
    """Un utilisateur sans rôle valide ne peut pas être inséré."""
    with app.app_context():
        user = UserAccount(
            matricule='SANSROLE1',
            username='sans-role',
            email='sans-role@uniarchive.edu',
            password_hash='x' * 60,
            role_id=99999,
        )
        db.session.add(user)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


def test_seeds_sont_idempotents(app):
    with app.app_context():
        avant = {
            'roles': Role.query.count(),
            'users': UserAccount.query.count(),
            'departments': Department.query.count(),
        }
        results = seeds.seed_all()
        # Tout existait déjà : aucune ligne créée
        assert all(count == 0 for count in results.values()), results
        assert Role.query.count() == avant['roles']
        assert UserAccount.query.count() == avant['users']
        assert Department.query.count() == avant['departments']
