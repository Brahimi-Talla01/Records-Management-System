"""
Extraction de texte des documents déposés (P6 du plan 07).

Deux canaux alimentant `document.ocr_text` (poids C du vecteur de recherche) :

* **PDF** : couche texte native via `pypdf` ;
* **image** (png/jpeg/tiff) : Tesseract, binaire `tesseract` + langues
  `OCR_LANGUAGES` (absent de l'environnement de test, présent dans l'image
  Docker).

L'extraction est **best-effort** et n'entraîne jamais l'échec d'un dépôt :
réglage `features.ocr_enabled` éteint, moteur manquant, fichier illisible ou
délai dépassé → `ocr_text` reste vide, le document est enregistré.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from io import BytesIO

from flask import current_app
from pypdf import PdfReader

from app.settings.service import SettingService
from app.storage import crypto, get_storage

logger = logging.getLogger(__name__)

IMAGE_MIMES = frozenset({'image/png', 'image/jpeg', 'image/tiff'})
MAX_TEXT = 500_000


def engine_available() -> bool:
    """Tesseract installé sur la machine ?"""
    return shutil.which('tesseract') is not None


def extract(storage_path: str, mime_type: str | None,
            campus_id: int | None = None) -> str | None:
    """Texte contenu dans le fichier stocké, ou `None` si non extractible."""
    if not SettingService.effective('features.ocr_enabled', campus_id):
        return None

    channel = _channel(mime_type)
    if channel is None:
        return None
    if channel == 'image' and not engine_available():
        logger.debug('OCR ignoré : tesseract absent (%s)', storage_path)
        return None

    try:
        with get_storage().open(storage_path) as handle:
            payload = crypto.readable(handle).read()
        text = _pdf_text(payload) if channel == 'pdf' else _tesseract(payload)
    except Exception:
        logger.warning('OCR impossible pour %s', storage_path, exc_info=True)
        return None

    return (text or '').strip()[:MAX_TEXT] or None


def _channel(mime_type: str | None) -> str | None:
    if mime_type == 'application/pdf':
        return 'pdf'
    if (mime_type or '') in IMAGE_MIMES:
        return 'image'
    return None


def _pdf_text(payload: bytes) -> str:
    reader = PdfReader(BytesIO(payload))
    pages = reader.pages[:current_app.config['OCR_MAX_PDF_PAGES']]
    return '\n'.join(page.extract_text() or '' for page in pages)


def _tesseract(payload: bytes) -> str:
    command = ['tesseract', 'stdin', 'stdout',
               '-l', current_app.config['OCR_LANGUAGES']]
    result = subprocess.run(command, input=payload, capture_output=True,
                            timeout=current_app.config['OCR_TIMEOUT_SECONDS'])
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8', 'replace'))
    return result.stdout.decode('utf-8', 'replace')
