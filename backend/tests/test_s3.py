"""
Stockage objet S3/MinIO (P6 du plan 07).

`S3Storage` est testé contre un client factice (aucun réseau) : la même interface
`save/open/exists/delete` que `LocalStorage`, y compris le calcul de l'empreinte
SHA-256 et le couple écriture/lecture utilisé par le chiffrement au repos.
"""

import base64
import hashlib
import io

import pytest
from botocore.exceptions import ClientError

from app import storage as storage_module
from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.document import Document
from app.storage import get_storage
from app.storage.base import StorageError
from app.storage.crypto import MAGIC
from app.storage.s3 import S3Storage

CONTENT = b'%PDF-1.4\n' + bytes(range(256)) * 512     # > 64 Ko : plusieurs lectures
KEY = base64.urlsafe_b64encode(bytes(range(32))).decode()


def _missing(key: str) -> ClientError:
    return ClientError({'Error': {'Code': 'NoSuchKey', 'Message': key}},
                       'GetObject')


class FakeClient:
    """Client boto3 simulé : objets en mémoire, mêmes signatures que boto3."""

    def __init__(self):
        self.objects = {}
        self.deleted = []

    def upload_fileobj(self, stream, bucket, key):
        self.objects[key] = stream.read()

    def download_fileobj(self, bucket, key, stream):
        if key not in self.objects:
            raise _missing(key)
        stream.write(self.objects[key])

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise _missing(Key)
        return {'ContentLength': len(self.objects[Key])}

    def delete_object(self, Bucket, Key):
        self.deleted.append(Key)
        self.objects.pop(Key, None)
        return {}


@pytest.fixture
def s3():
    return S3Storage('uniarchive', FakeClient(), prefix='archives')


def test_save_renvoie_chemin_taille_et_empreinte(s3):
    result = s3.save('2026/10/v1.pdf', io.BytesIO(CONTENT))

    assert result == {'path': '2026/10/v1.pdf',
                      'size': len(CONTENT),
                      'checksum': hashlib.sha256(CONTENT).hexdigest()}
    assert s3.client.objects['archives/2026/10/v1.pdf'] == CONTENT


def test_save_sans_prefixe_ecrit_la_cle_nue():
    storage = S3Storage('bucket', FakeClient())

    storage.save('a.pdf', io.BytesIO(CONTENT))

    assert storage.client.objects == {'a.pdf': CONTENT}


def test_open_restitue_le_contenu(s3):
    s3.save('2026/10/v1.pdf', io.BytesIO(CONTENT))

    with s3.open('2026/10/v1.pdf') as handle:
        assert handle.read() == CONTENT


def test_open_objet_absent_leve_storage_error(s3):
    with pytest.raises(StorageError):
        s3.open('absent.pdf')


def test_exists_et_delete(s3):
    s3.save('2026/10/v1.pdf', io.BytesIO(CONTENT))

    assert s3.exists('2026/10/v1.pdf') is True
    assert s3.delete('2026/10/v1.pdf') is True
    assert s3.exists('2026/10/v1.pdf') is False
    assert s3.delete('2026/10/v1.pdf') is False
    assert s3.client.deleted == ['archives/2026/10/v1.pdf']


def test_chemin_de_sortie_refuse(s3):
    with pytest.raises(StorageError):
        s3.save('../hors-bucket.pdf', io.BytesIO(CONTENT))
    # `exists` reste non levant, comme LocalStorage
    assert s3.exists('../hors-bucket.pdf') is False
    with pytest.raises(StorageError):
        s3.delete('../hors-bucket.pdf')


def test_get_storage_retourne_s3(app, monkeypatch):
    monkeypatch.setitem(app.config, 'STORAGE_BACKEND', 's3')
    monkeypatch.setitem(app.config, 'S3_BUCKET', 'uniarchive')
    monkeypatch.setitem(app.config, 'S3_PREFIX', 'archives')
    fake = FakeClient()
    monkeypatch.setattr(storage_module, '_s3_client', lambda: fake)

    storage = get_storage()

    assert isinstance(storage, S3Storage)
    assert storage.bucket == 'uniarchive'
    assert storage.prefix == 'archives'
    assert storage.client is fake


def test_get_storage_s3_exige_un_bucket():
    import os
    import subprocess
    import sys
    env = {**os.environ, 'STORAGE_BACKEND': 's3', 'S3_BUCKET': ''}
    code = "from app import create_app; create_app('testing'); print('CREATED')"
    result = subprocess.run([sys.executable, '-c', code],
                            capture_output=True, text=True, env=env, timeout=60)

    assert result.returncode != 0
    assert 'CREATED' not in result.stdout
    assert 'S3_BUCKET' in result.stderr


def test_depot_document_sur_s3(app, admin, monkeypatch):
    monkeypatch.setitem(app.config, 'STORAGE_BACKEND', 's3')
    monkeypatch.setitem(app.config, 'S3_BUCKET', 'uniarchive')
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    fake = FakeClient()
    monkeypatch.setattr(storage_module, '_s3_client', lambda: fake)
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        doc_type = DocType.query.first()
        assert campus is not None and doc_type is not None
        campus_id, doc_type_id = campus.campus_id, doc_type.doc_type_id

    response = admin.post('/api/documents', data={
        'title': 'Décision du conseil',
        'doc_type_id': str(doc_type_id),
        'campus_id': str(campus_id),
        'confidentiality_level': 'secret',
        'file': (io.BytesIO(CONTENT), 'decision.pdf'),
    }, content_type='multipart/form-data')
    assert response.status_code == 201, response.get_json()
    document_id = response.get_json()['document_id']

    assert len(fake.objects) == 1
    sealed = next(iter(fake.objects.values()))
    assert sealed.startswith(MAGIC)

    version_id = admin.get(f'/api/documents/{document_id}/versions').get_json()[
        'versions'][0]['version_id']
    download = admin.get(
        f'/api/documents/{document_id}/versions/{version_id}/download')
    assert download.status_code == 200
    assert download.data == CONTENT

    with app.app_context():
        document = Document.query.get(document_id)
        assert document is not None
        assert document.is_encrypted is True
        assert document.size_bytes == len(CONTENT)
