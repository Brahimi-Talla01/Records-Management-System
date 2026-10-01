import hashlib
import os

from app.storage.base import Storage, StorageError

CHUNK = 64 * 1024


class LocalStorage(Storage):
    def __init__(self, root: str):
        self.root = os.path.abspath(root)

    def _resolve(self, relative_path: str) -> str:
        normalized = (relative_path or '').replace('\\', '/').lstrip('/')
        if not normalized or '..' in normalized.split('/'):
            raise StorageError('Chemin de stockage invalide.')
        path = os.path.abspath(os.path.join(self.root, normalized))
        if path != self.root and not path.startswith(self.root + os.sep):
            raise StorageError('Chemin de stockage hors racine.')
        return path

    def save(self, relative_path: str, stream) -> dict:
        path = self._resolve(relative_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        digest = hashlib.sha256()
        size = 0
        with open(path, 'wb') as handle:
            while True:
                chunk = stream.read(CHUNK)
                if not chunk:
                    break
                handle.write(chunk)
                digest.update(chunk)
                size += len(chunk)
        return {'path': relative_path, 'size': size, 'checksum': digest.hexdigest()}

    def open(self, relative_path: str):
        return open(self._resolve(relative_path), 'rb')

    def delete(self, relative_path: str) -> bool:
        try:
            os.remove(self._resolve(relative_path))
            return True
        except FileNotFoundError:
            return False

    def exists(self, relative_path: str) -> bool:
        try:
            return os.path.isfile(self._resolve(relative_path))
        except StorageError:
            return False
