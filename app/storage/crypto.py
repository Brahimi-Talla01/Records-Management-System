"""
Chiffrement au repos des fichiers (P6 du plan 07).

Format auto-décrit :

    MAGIC || (nonce(12) || longueur(4) || AES-GCM(bloc))*

La marque de début de fichier suffit à savoir si un fichier doit être déchiffré
(aucune dépendance à la configuration à la lecture) ; l'AAD porte l'index du
bloc, donc suppression, substitution ou réordonnancement de bloc est détecté.

Activation : `FILE_ENCRYPTION_KEY` (base64 de 32 octets) + `ENCRYPTED_LEVELS`
(niveaux de confidentialité concernés, par défaut `confidential,secret`).
Sans clé, rien n'est chiffré et les fichiers déjà présents restent lisibles.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import io
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app

from app.storage import get_storage

MAGIC = b'UNIARCH\x01'
CHUNK = 64 * 1024
_NONCE_SIZE = 12
_BLOCK_HEADER = _NONCE_SIZE + 4


class CryptoError(Exception):
    """Fichier chiffré illisible : clé absente, mal formée ou contenu altéré."""


def parse_key(raw: str) -> bytes:
    """Décode une clé base64 (url-safe ou standard) de 16, 24 ou 32 octets."""
    try:
        key = base64.b64decode(raw.replace('-', '+').replace('_', '/'),
                               validate=True)
    except (ValueError, binascii.Error) as exc:
        raise CryptoError('FILE_ENCRYPTION_KEY n\'est pas du base64 valide.') from exc
    if len(key) not in (16, 24, 32):
        raise CryptoError('FILE_ENCRYPTION_KEY doit décoder 16, 24 ou 32 octets.')
    return key


def _require_key() -> bytes:
    raw = current_app.config.get('FILE_ENCRYPTION_KEY')
    if not raw:
        raise CryptoError('Chiffrement demandé sans FILE_ENCRYPTION_KEY.')
    return parse_key(raw)


def enabled() -> bool:
    return bool(current_app.config.get('FILE_ENCRYPTION_KEY'))


def encrypted_levels() -> set[str]:
    """`ENCRYPTED_LEVELS` accepte une liste ou une chaîne « a,b,c »."""
    raw = current_app.config.get('ENCRYPTED_LEVELS') or ()
    if isinstance(raw, str):
        raw = raw.split(',')
    return {item.strip() for item in raw if str(item).strip()}


def should_encrypt(level: str | None) -> bool:
    """Le niveau de confidentialité impose-t-il le chiffrement du fichier ?"""
    if not enabled():
        return False
    return (level or '') in encrypted_levels()


def is_encrypted(header: bytes) -> bool:
    return header.startswith(MAGIC)


def encrypt(source, dest) -> dict:
    """Chiffre `source` vers `dest`, renvoie checksum et taille du clair."""
    cipher = AESGCM(_require_key())
    digest = hashlib.sha256()
    size = 0
    dest.write(MAGIC)
    index = 0
    while True:
        chunk = source.read(CHUNK)
        if not chunk:
            break
        digest.update(chunk)
        size += len(chunk)
        nonce = os.urandom(_NONCE_SIZE)
        payload = cipher.encrypt(nonce, chunk, _aad(index))
        dest.write(nonce + len(payload).to_bytes(4, 'big') + payload)
        index += 1
    return {'checksum': digest.hexdigest(), 'size': size}


def decrypt(source, dest) -> None:
    """Déchiffre `source` vers `dest`, ou lève `CryptoError`."""
    cipher = AESGCM(_require_key())
    if source.read(len(MAGIC)) != MAGIC:
        raise CryptoError('Fichier sans marque de chiffrement.')
    index = 0
    while True:
        header = source.read(_BLOCK_HEADER)
        if not header:
            return
        if len(header) < _BLOCK_HEADER:
            raise CryptoError('Fichier chiffré tronqué.')
        size = int.from_bytes(header[_NONCE_SIZE:], 'big')
        payload = source.read(size)
        if len(payload) != size:
            raise CryptoError('Fichier chiffré tronqué.')
        try:
            plaintext = cipher.decrypt(header[:_NONCE_SIZE], payload, _aad(index))
        except InvalidTag as exc:
            raise CryptoError('Fichier chiffré altéré.') from exc
        dest.write(plaintext)
        index += 1


def readable(source):
    """Flux prêt à être servi : déchiffre si la marque de chiffrement est là.

    Dans les deux cas un flux **indépendant de la connexion** est renvoyé : le
    handle fichier est fermé avant le retour (un worker gunicorn multi-threads
    ferme sinon le fichier au teardown, après l'envoi — corps de réponse vide).
    """
    with source:
        header = source.read(len(MAGIC))
        source.seek(0)
        if not is_encrypted(header):
            # Fichier en clair : servi depuis la mémoire (taille d'un document
            # ≤ MAX_CONTENT_LENGTH = 50 Mo, bornée par Nginx et l'API).
            buffer = io.BytesIO(source.read())
            buffer.seek(0)
            return buffer
        buffer = io.BytesIO()
        decrypt(source, buffer)
        buffer.seek(0)
        return buffer


def stored_encrypted(storage_path: str) -> bool:
    """Le fichier déjà stocké porte-t-il la marque de chiffrement ?"""
    with get_storage().open(storage_path) as handle:
        return is_encrypted(handle.read(len(MAGIC)))


def _aad(index: int) -> bytes:
    return MAGIC + index.to_bytes(8, 'big')
