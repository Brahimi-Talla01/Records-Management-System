"""
Chiffrement au repos des fichiers (P6 du plan 07).

Le format auto-décrit (`UNIARCH\\x01`) permet de déchiffrer sans dépendre de la
configuration à la lecture : les tests couvrent donc le round-trip multi-blocs,
la détection d'altération (AAD = index du bloc), le branchement dépôt/téléchargement
et le refus de démarrage avec une clé mal formée.
"""

import base64
import hashlib
import io
import os
import subprocess
import sys

import pytest

from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.document import Document
from app.services import ocr_service
from app.settings.service import SettingService
from app.storage import crypto, get_storage
from app.storage.crypto import MAGIC, CryptoError

KEY = base64.urlsafe_b64encode(bytes(range(32))).decode()
PLAIN = bytes(range(256)) * 1500          # 384 Ko → 6 blocs de 64 Ko
PDF = b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF\n'
PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'


def _seal(payload: bytes) -> bytes:
    dest = io.BytesIO()
    crypto.encrypt(io.BytesIO(payload), dest)
    return dest.getvalue()


def _unseal(raw: bytes) -> bytes:
    out = io.BytesIO()
    crypto.decrypt(io.BytesIO(raw), out)
    return out.getvalue()


def _blocks(raw: bytes) -> list[bytes]:
    body, blocks = raw[len(MAGIC):], []
    while body:
        size = int.from_bytes(body[12:16], 'big')
        blocks.append(body[:16 + size])
        body = body[16 + size:]
    return blocks


def _seed_ids(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        doc_type = DocType.query.first()
        assert campus is not None and doc_type is not None
        return campus.campus_id, doc_type.doc_type_id


def _upload(admin, campus_id, doc_type_id, payload=PDF, level='secret'):
    return admin.post('/api/documents', data={
        'title': 'Décision du conseil',
        'doc_type_id': str(doc_type_id),
        'campus_id': str(campus_id),
        'confidentiality_level': level,
        'file': (io.BytesIO(payload), 'decision.pdf'),
    }, content_type='multipart/form-data')


def _stored_payload(app, document_id):
    with app.app_context():
        document = Document.query.get(document_id)
        assert document is not None
        version = document.versions[0]
        with get_storage().open(version.storage_url) as handle:
            payload = handle.read()
        return version.checksum, document.size_bytes, document.is_encrypted, payload


def test_round_trip_sur_plusieurs_blocs(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)

    raw = _seal(PLAIN)

    assert raw.startswith(MAGIC)
    assert len(_blocks(raw)) == 6
    assert _unseal(raw) == PLAIN


def test_checksum_et_taille_decrivent_le_clair(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    dest = io.BytesIO()

    seal = crypto.encrypt(io.BytesIO(PLAIN), dest)

    assert seal == {'checksum': hashlib.sha256(PLAIN).hexdigest(),
                    'size': len(PLAIN)}


def test_bloc_altere_rejete(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    raw = bytearray(_seal(PLAIN))
    raw[-1] ^= 0xFF

    with pytest.raises(CryptoError, match='altéré'):
        _unseal(bytes(raw))


def test_troncature_rejetee(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    raw = _seal(PLAIN)[:-5]

    with pytest.raises(CryptoError, match='tronqué'):
        _unseal(raw)


def test_reordonnancement_des_blocs_rejete(app, monkeypatch):
    """L'AAD porte l'index du bloc : deux blocs échangés ne passent pas."""
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    blocks = _blocks(_seal(PLAIN))
    blocks[0], blocks[1] = blocks[1], blocks[0]
    raw = MAGIC + b''.join(blocks)

    with pytest.raises(CryptoError, match='altéré'):
        _unseal(raw)


def test_readable_rend_le_clair_sans_marque(app):
    source = io.BytesIO(PDF)

    stream = crypto.readable(source)

    assert stream.read() == PDF


def test_readable_ferme_la_source_et_sert_apres_fermeture(app):
    """Le flux renvoyé doit survivre à la fermeture du handle source.

    Régression : un worker gunicorn ferme le fichier au teardown, après
    l'envoi de la réponse — le corps partait alors vide (streaming tenté sur
    un handle fermé).
    """
    import tempfile

    handle = open(tempfile.NamedTemporaryFile(suffix='.pdf', delete=False).name,
                  'rb+')
    handle.write(PDF)
    handle.seek(0)

    stream = crypto.readable(handle)

    assert handle.closed  # la source est fermée par readable
    assert stream.read() == PDF  # et le flux servi reste intact


def test_readable_dechiffre_la_marque(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)

    stream = crypto.readable(io.BytesIO(_seal(PDF)))

    assert stream.read() == PDF


def test_should_encrypt_depend_du_niveau(app, monkeypatch):
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)

    assert crypto.should_encrypt('secret') is True
    assert crypto.should_encrypt('confidential') is True
    assert crypto.should_encrypt('internal') is False
    assert crypto.should_encrypt('public') is False
    assert crypto.should_encrypt(None) is False


def test_niveaux_lus_depuis_une_chaine(app, monkeypatch):
    monkeypatch.setitem(app.config, 'ENCRYPTED_LEVELS', 'secret , confidential,')

    assert crypto.encrypted_levels() == {'secret', 'confidential'}


def test_sans_cle_rien_n_est_chiffre(app):
    assert crypto.enabled() is False
    assert crypto.should_encrypt('secret') is False


def test_parse_key_refuse_une_cle_courte():
    short = base64.urlsafe_b64encode(b'court').decode()

    with pytest.raises(CryptoError, match='16, 24 ou 32'):
        crypto.parse_key(short)


def test_depot_secret_est_chiffre_et_telechargeable(app, admin, monkeypatch):
    campus_id, doc_type_id = _seed_ids(app)
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)

    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()
    document_id = response.get_json()['document_id']

    checksum, size, encrypted, payload = _stored_payload(app, document_id)
    assert payload.startswith(MAGIC)
    assert encrypted is True
    assert checksum == hashlib.sha256(PDF).hexdigest()
    assert size == len(PDF)

    version_id = admin.get(f'/api/documents/{document_id}/versions').get_json()[
        'versions'][0]['version_id']
    download = admin.get(
        f'/api/documents/{document_id}/versions/{version_id}/download')
    assert download.status_code == 200
    assert download.data == PDF


def test_depot_public_reste_en_clair(app, admin, monkeypatch):
    campus_id, doc_type_id = _seed_ids(app)
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)

    response = _upload(admin, campus_id, doc_type_id, level='public')
    assert response.status_code == 201, response.get_json()
    document_id = response.get_json()['document_id']

    checksum, size, encrypted, payload = _stored_payload(app, document_id)
    assert not payload.startswith(MAGIC)
    assert encrypted is False
    assert payload == PDF
    assert checksum == hashlib.sha256(PDF).hexdigest()
    assert size == len(PDF)


def test_ocr_dechiffre_avant_reconnaissance(app, monkeypatch):
    class _Storage:
        def __init__(self, payload):
            self.payload = payload

        def open(self, path):
            return io.BytesIO(self.payload)

    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    SettingService.set_value('features.ocr_enabled', True)
    vu = []
    monkeypatch.setattr(ocr_service, 'engine_available', lambda: True)
    monkeypatch.setattr(ocr_service, '_tesseract',
                        lambda payload: vu.append(payload) or 'Texte lu')
    monkeypatch.setattr(ocr_service, 'get_storage', lambda: _Storage(_seal(PNG)))

    assert ocr_service.extract('PRINCIPAL/2026/10/v1_a.png',
                               'image/png') == 'Texte lu'
    assert vu == [PNG]


def test_restauration_conserve_le_drapeau(app, admin, monkeypatch):
    campus_id, doc_type_id = _seed_ids(app)
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()
    document_id = response.get_json()['document_id']
    version_id = admin.get(f'/api/documents/{document_id}/versions').get_json()[
        'versions'][0]['version_id']

    restored = admin.post(
        f'/api/documents/{document_id}/versions/{version_id}/restore')

    assert restored.status_code == 201, restored.get_json()
    with app.app_context():
        document = Document.query.get(document_id)
        assert document is not None
        assert document.is_encrypted is True


def test_telechargement_sans_cle_repond_500(app, admin, monkeypatch):
    campus_id, doc_type_id = _seed_ids(app)
    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', KEY)
    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()
    document_id = response.get_json()['document_id']
    version_id = admin.get(f'/api/documents/{document_id}/versions').get_json()[
        'versions'][0]['version_id']

    monkeypatch.setitem(app.config, 'FILE_ENCRYPTION_KEY', '')
    download = admin.get(
        f'/api/documents/{document_id}/versions/{version_id}/download')

    assert download.status_code == 500
    assert download.get_json()['code'] == 'encrypted_file_unreadable'


def test_demarrage_refuse_une_cle_mal_formee():
    env = {**os.environ, 'FILE_ENCRYPTION_KEY': 'pas-du-base64!!'}
    code = "from app import create_app; create_app('testing'); print('CREATED')"
    result = subprocess.run([sys.executable, '-c', code],
                            capture_output=True, text=True, env=env, timeout=60)

    assert result.returncode != 0
    assert 'CREATED' not in result.stdout
    assert 'FILE_ENCRYPTION_KEY' in result.stderr
