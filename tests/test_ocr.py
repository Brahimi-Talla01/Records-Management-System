"""
Extraction de texte : OCR images et couche PDF (P6 du plan 07).

Le binaire `tesseract` n'est pas exigé par la suite : les moteurs sont
remplacés (`monkeypatch`) et seule l'intégration `pypdf` est réellement
exécutée sur un PDF minimal construit par le test.
"""

import io

import pytest

from app.models.campus import Campus
from app.models.doc_type import DocType
from app.models.document import Document
from app.services import ocr_service
from app.settings.service import SettingService
from extensions import db

PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
TEXT = 'Compte rendu du conseil de direction 2026'


class _Storage:
    def __init__(self, payload):
        self.payload = payload

    def open(self, path):
        return io.BytesIO(self.payload)


def _pdf_with_text(text: str) -> bytes:
    """PDF minimal (xref cohérent) portant une chaîne de caractères."""
    content = f'BT /F1 24 Tf 72 700 Td ({text}) Tj ET'.encode('latin-1')
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        (b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] '
         b'/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>'),
        b'<< /Length %d >>\nstream\n' % len(content) + content + b'\nendstream',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ]
    out = bytearray(b'%PDF-1.4\n')
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b'%d 0 obj\n' % index + body + b'\nendobj\n'
    xref = len(out)
    out += b'xref\n0 %d\n' % (len(objects) + 1)
    out += b'0000000000 65535 f \n'
    out += b''.join(b'%010d 00000 n \n' % offset for offset in offsets)
    out += (b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n'
            % (len(objects) + 1, xref))
    return bytes(out)


def _enable_ocr():
    SettingService.set_value('features.ocr_enabled', True)


def _seed_ids(app):
    with app.app_context():
        campus = Campus.query.filter_by(code='PRINCIPAL').first()
        doc_type = DocType.query.first()
        assert campus is not None and doc_type is not None
        return campus.campus_id, doc_type.doc_type_id


def _upload(admin, campus_id, doc_type_id, name='scan.png'):
    return admin.post('/api/documents', data={
        'title': 'Scan du conseil',
        'doc_type_id': str(doc_type_id),
        'campus_id': str(campus_id),
        'file': (io.BytesIO(PNG), name),
    }, content_type='multipart/form-data')


def test_desactive_par_defaut(monkeypatch):
    monkeypatch.setattr(
        ocr_service, '_tesseract',
        lambda payload: pytest.fail('moteur appelé alors que le réglage est éteint'))
    assert ocr_service.extract('v1.png', 'image/png') is None


def test_type_hors_perimetre(monkeypatch):
    _enable_ocr()
    monkeypatch.setattr(
        ocr_service, 'get_storage',
        lambda: pytest.fail('fichier lu alors que le type est ignoré'))
    assert ocr_service.extract('v1.docx',
                               'application/vnd.openxmlformats-officedocument'
                               '.wordprocessingml.document') is None


def test_image_passe_par_tesseract(monkeypatch):
    _enable_ocr()
    lu = {}

    def fake_tesseract(payload):
        lu['payload'] = payload
        return '  Texte reconnu  '

    monkeypatch.setattr(ocr_service, 'engine_available', lambda: True)
    monkeypatch.setattr(ocr_service, '_tesseract', fake_tesseract)
    monkeypatch.setattr(ocr_service, 'get_storage', lambda: _Storage(PNG))

    assert ocr_service.extract('PRINCIPAL/2026/10/v1_a.png', 'image/png') == 'Texte reconnu'
    assert lu['payload'] == PNG


def test_tesseract_absent(monkeypatch):
    _enable_ocr()
    monkeypatch.setattr(ocr_service, 'engine_available', lambda: False)
    monkeypatch.setattr(
        ocr_service, '_tesseract',
        lambda payload: pytest.fail('tesseract invoqué sans binaire'))
    assert ocr_service.extract('v1.png', 'image/png') is None


def test_echec_moteur_ne_bloque_rien(monkeypatch):
    _enable_ocr()

    def explode(payload):
        raise RuntimeError('tesseract a échoué')

    monkeypatch.setattr(ocr_service, 'engine_available', lambda: True)
    monkeypatch.setattr(ocr_service, '_tesseract', explode)
    monkeypatch.setattr(ocr_service, 'get_storage', lambda: _Storage(PNG))
    assert ocr_service.extract('v1.png', 'image/png') is None


def test_pdf_est_lu_via_pypdf(monkeypatch):
    _enable_ocr()
    payload = _pdf_with_text(TEXT)
    monkeypatch.setattr(ocr_service, 'get_storage', lambda: _Storage(payload))
    assert ocr_service.extract('PRINCIPAL/2026/10/v1_a.pdf',
                               'application/pdf') == TEXT


def test_depot_remplit_ocr_text(app, admin, monkeypatch):
    _enable_ocr()
    monkeypatch.setattr(ocr_service, 'engine_available', lambda: True)
    monkeypatch.setattr(ocr_service, '_tesseract', lambda payload: TEXT)
    campus_id, doc_type_id = _seed_ids(app)

    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()

    with app.app_context():
        document = Document.query.get(response.get_json()['document_id'])
        assert document is not None
        assert document.ocr_text == TEXT


def test_depot_sans_reglage_ne_consulte_pas_le_moteur(app, admin, monkeypatch):
    monkeypatch.setattr(
        ocr_service, '_tesseract',
        lambda payload: pytest.fail('moteur appelé alors que le réglage est éteint'))
    campus_id, doc_type_id = _seed_ids(app)

    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()

    with app.app_context():
        document = Document.query.get(response.get_json()['document_id'])
        assert document is not None
        assert document.ocr_text is None


def test_recherche_porte_sur_le_texte_ocr(app, admin):
    campus_id, doc_type_id = _seed_ids(app)
    response = _upload(admin, campus_id, doc_type_id)
    assert response.status_code == 201, response.get_json()

    with app.app_context():
        document = Document.query.get(response.get_json()['document_id'])
        assert document is not None
        document.ocr_text = 'prévision budgétaire révisée'
        db.session.commit()

    result = admin.get('/api/search', query_string={'q': 'budgétaire'})
    assert result.status_code == 200, result.get_json()
    found = {item['document_id'] for item in result.get_json()['items']}
    assert response.get_json()['document_id'] in found
