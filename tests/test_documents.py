import io

import pytest

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.folder import Folder
from app.models.role import Role
from app.models.tag import Tag
from app.models.user import UserAccount
from extensions import db

PDF = b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n'
PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'


@pytest.fixture
def principal_id(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert campus is not None
        return campus.campus_id


@pytest.fixture
def campus_admin(app, client, do_login):
    with app.app_context():
        role = Role.query.filter_by(name='Admin').first()
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        assert role is not None and campus is not None
        user = UserAccount(
            matricule='ADMINC2', username='adminc2', email='adminc2@uniarchive.edu',
            full_name='Admin de campus', role_id=role.role_id,
            campus_id=campus.campus_id, is_active=True,
        )
        user.set_password('AdminC@2024')
        db.session.add(user)
        db.session.commit()
    return do_login('adminc2', 'AdminC@2024')


@pytest.fixture
def doc_type_id(app):
    with app.app_context():
        doc_type = DocType.query.filter_by(name='Rapport').first()
        assert doc_type is not None
        return doc_type.doc_type_id


def create_doc(admin, doc_type_id, campus_id, file=None, **fields):
    data = {'title': fields.pop('title', 'Rapport de test'),
            'doc_type_id': str(doc_type_id),
            'campus_id': str(campus_id)}
    for key, value in fields.items():
        data[key] = value if isinstance(value, str) else str(value)
    if file is not None:
        content, name = file
        data['file'] = (io.BytesIO(content), name)
        return admin.post('/api/documents', data=data,
                          content_type='multipart/form-data')
    return admin.post('/api/documents', data=data,
                      content_type='multipart/form-data')


def test_creation_avec_fichier(admin, doc_type_id, principal_id):
    resp = create_doc(admin, doc_type_id, principal_id, file=(PDF, 'rapport.pdf'))

    assert resp.status_code == 201, resp.get_json()
    body = resp.get_json()
    assert body['size_bytes'] == len(PDF)
    versions = admin.get(f"/api/documents/{body['document_id']}/versions").get_json()
    assert [v['version_number'] for v in versions['versions']] == [1]


def test_creation_metadonnees_sans_fichier(admin, doc_type_id, principal_id):
    resp = create_doc(admin, doc_type_id, principal_id)

    assert resp.status_code == 201
    assert resp.get_json()['status'] == 'active'


def test_creation_sans_titre(admin, doc_type_id, principal_id):
    resp = admin.post('/api/documents', json={'doc_type_id': doc_type_id,
                                              'campus_id': principal_id})
    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'missing_title'


def test_creation_sans_type(admin, principal_id):
    resp = admin.post('/api/documents', json={'title': 'X', 'campus_id': principal_id})
    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'doc_type_not_found'


def test_creation_extension_interdite(admin, doc_type_id, principal_id):
    resp = create_doc(admin, doc_type_id, principal_id, file=(b'hello', 'note.exe'))

    assert resp.status_code == 422
    assert resp.get_json()['code'] == 'extension_not_allowed'


def test_creation_magic_bytes_invalides(admin, doc_type_id, principal_id):
    resp = create_doc(admin, doc_type_id, principal_id,
                      file=(b'ceci nest pas un pdf', 'faux.pdf'))

    assert resp.status_code == 422
    assert resp.get_json()['code'] == 'invalid_file_signature'


def test_creation_super_admin_sans_campus(admin, doc_type_id):
    resp = admin.post('/api/documents', json={'title': 'X', 'doc_type_id': doc_type_id})
    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'missing_campus'


def test_liste_scopee_et_pagination(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id)
    resp = admin.get('/api/documents')

    assert resp.status_code == 200
    body = resp.get_json()
    assert set(body) >= {'items', 'page', 'per_page', 'total', 'pages'}
    assert body['total'] == 1


def test_liste_filtre_par_recherche(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Thèse mécanique')
    create_doc(admin, doc_type_id, principal_id, title='Rapport annuel')

    resp = admin.get('/api/documents?q=mécanique')
    assert [d['title'] for d in resp.get_json()['items']] == ['Thèse mécanique']


def test_liste_filtre_par_type(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id)
    resp = admin.get(f'/api/documents?doc_type_id={doc_type_id}')
    assert resp.get_json()['total'] == 1


def test_detail_inclut_les_versions(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'a.pdf')).get_json()['document_id']
    resp = admin.get(f'/api/documents/{doc_id}')

    assert resp.status_code == 200
    assert len(resp.get_json()['versions']) == 1


def test_mise_a_jour_titre(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    resp = admin.patch(f'/api/documents/{doc_id}', json={'title': 'Nouveau titre'})

    assert resp.status_code == 200
    assert resp.get_json()['title'] == 'Nouveau titre'


def test_confidentialite_invalide(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    resp = admin.patch(f'/api/documents/{doc_id}',
                       json={'confidentiality_level': 'topsecret'})

    assert resp.status_code == 400
    assert resp.get_json()['code'] == 'invalid_confidentiality'


def test_soft_delete_et_restauration(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']

    deleted = admin.delete(f'/api/documents/{doc_id}')
    assert deleted.status_code == 200
    assert deleted.get_json()['status'] == 'deleted'
    assert admin.get('/api/documents').get_json()['total'] == 0
    assert admin.get('/api/documents?status=deleted').get_json()['total'] == 1

    restored = admin.post(f'/api/documents/{doc_id}/restore')
    assert restored.get_json()['status'] == 'active'


def test_deuxieme_version(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'v1.pdf')).get_json()['document_id']
    resp = admin.post(f'/api/documents/{doc_id}/versions',
                      data={'file': (io.BytesIO(PDF), 'v2.pdf'),
                            'change_note': 'correction'},
                      content_type='multipart/form-data')

    assert resp.status_code == 201
    assert resp.get_json()['version_number'] == 2


def test_restauration_de_version(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'v1.pdf')).get_json()['document_id']
    version_id = admin.get(f'/api/documents/{doc_id}/versions').get_json()[
        'versions'][0]['version_id']

    resp = admin.post(f'/api/documents/{doc_id}/versions/{version_id}/restore')

    assert resp.status_code == 201
    assert resp.get_json()['version_number'] == 2


def test_telechargement(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'v1.pdf')).get_json()['document_id']
    version_id = admin.get(f'/api/documents/{doc_id}/versions').get_json()[
        'versions'][0]['version_id']

    resp = admin.get(f'/api/documents/{doc_id}/versions/{version_id}/download')

    assert resp.status_code == 200
    assert resp.data == PDF
    assert 'attachment' in resp.headers['Content-Disposition']


def test_telechargement_journalise(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'v1.pdf')).get_json()['document_id']
    version_id = admin.get(f'/api/documents/{doc_id}/versions').get_json()[
        'versions'][0]['version_id']
    admin.get(f'/api/documents/{doc_id}/versions/{version_id}/download')

    with admin.client.application.app_context():
        assert AuditLog.query.filter_by(action='document_downloaded').count() == 1


def test_apercu_pdf_et_type_non_apercu(admin, doc_type_id, principal_id):
    pdf_id = create_doc(admin, doc_type_id, principal_id,
                        file=(PDF, 'v1.pdf')).get_json()['document_id']
    docx_id = create_doc(admin, doc_type_id, principal_id,
                         file=(b'PK\x03\x04docx', 'v1.docx')).get_json()['document_id']

    assert admin.get(f'/api/documents/{pdf_id}/preview').status_code == 200
    resp = admin.get(f'/api/documents/{docx_id}/preview')
    assert resp.status_code == 422
    assert resp.get_json()['code'] == 'preview_not_supported'


def test_tags_ajout_et_retrait(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']

    added = admin.post(f'/api/documents/{doc_id}/tags',
                       json={'tags': ['soutenance', '2026']})
    assert added.status_code == 200

    with admin.client.application.app_context():
        assert Tag.query.count() == 2

    admin.delete(f'/api/documents/{doc_id}/tags', json={'tags': ['2026']})
    with admin.client.application.app_context():
        document = db.session.get(Document, doc_id)
        assert document is not None
        assert [t.name for t in document.tags.all()] == ['soutenance']


def test_export_csv(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id, title='Exportable')
    resp = admin.get('/api/documents/export')

    assert resp.status_code == 200
    assert 'text/csv' in resp.headers['Content-Type']
    assert b'Exportable' in resp.data


def test_actions_groupees(admin, doc_type_id, principal_id):
    ids = [create_doc(admin, doc_type_id, principal_id, title=f'D{i}').get_json()[
        'document_id'] for i in range(2)]
    resp = admin.post('/api/documents/bulk', json={'ids': ids, 'action': 'delete'})

    assert resp.status_code == 200
    assert admin.get('/api/documents').get_json()['total'] == 0


def test_creation_journalisee(admin, doc_type_id, principal_id):
    create_doc(admin, doc_type_id, principal_id)
    with admin.client.application.app_context():
        assert AuditLog.query.filter_by(action='document_created').count() == 1


def test_csrf_requis(admin, doc_type_id, principal_id):
    admin.without_csrf()
    resp = admin.post('/api/documents', json={'title': 'X', 'doc_type_id': doc_type_id,
                                              'campus_id': principal_id})
    assert resp.status_code == 403


def test_liste_exige_authentification(client):
    assert client.get('/api/documents').status_code == 401


def test_perimetre_campus(campus_admin, app, doc_type_id):
    with app.app_context():
        second = Campus(code='SUD', name='Campus Sud')
        db.session.add(second)
        db.session.commit()
        document = Document(title='Secret SUD', campus_id=second.campus_id,
                            doc_type_id=doc_type_id, confidentiality_level='internal')
        db.session.add(document)
        db.session.commit()
        document_id = document.document_id

    assert campus_admin.get(f'/api/documents/{document_id}').status_code == 403
    listed = campus_admin.get('/api/documents').get_json()['items']
    assert document_id not in [d['document_id'] for d in listed]


def test_deplacement_dans_un_dossier(admin, doc_type_id, principal_id):
    doc_id = create_doc(admin, doc_type_id, principal_id).get_json()['document_id']
    folder = None
    with admin.client.application.app_context():
        folder = Folder(name='Sous-dossier', campus_id=principal_id)
        db.session.add(folder)
        db.session.commit()
        folder_id = folder.folder_id

    resp = admin.patch(f'/api/documents/{doc_id}', json={'folder_id': folder_id})
    assert resp.status_code == 200
    assert resp.get_json()['folder_id'] == folder_id
