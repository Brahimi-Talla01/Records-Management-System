import hashlib
import tempfile

from botocore.exceptions import BotoCoreError, ClientError

from app.storage.base import Storage, StorageError

CHUNK = 64 * 1024
SPOOL = 8 * 1024 * 1024


class S3Storage(Storage):
    """Stockage objet S3/MinIO : l'objet est mis en tampon pour que le flux
    soit relisible (multipart) et pour en calculer l'empreinte SHA-256."""

    def __init__(self, bucket: str, client, prefix: str = ''):
        self.bucket = bucket
        self.client = client
        self.prefix = (prefix or '').strip('/')

    def _key(self, relative_path: str) -> str:
        normalized = (relative_path or '').replace('\\', '/').lstrip('/')
        if not normalized or '..' in normalized.split('/'):
            raise StorageError('Chemin de stockage invalide.')
        return f'{self.prefix}/{normalized}' if self.prefix else normalized

    def save(self, relative_path: str, stream) -> dict:
        digest = hashlib.sha256()
        size = 0
        with tempfile.SpooledTemporaryFile(max_size=SPOOL) as buffer:
            while True:
                chunk = stream.read(CHUNK)
                if not chunk:
                    break
                digest.update(chunk)
                size += len(chunk)
                buffer.write(chunk)
            buffer.seek(0)
            try:
                self.client.upload_fileobj(buffer, self.bucket,
                                           self._key(relative_path))
            except (BotoCoreError, ClientError) as exc:
                raise StorageError(
                    f'Écriture S3 impossible ({self.bucket}) : {exc}') from exc
        return {'path': relative_path, 'size': size,
                'checksum': digest.hexdigest()}

    def open(self, relative_path: str):
        handle = tempfile.SpooledTemporaryFile(max_size=SPOOL)
        try:
            self.client.download_fileobj(self.bucket, self._key(relative_path),
                                         handle)
        except (BotoCoreError, ClientError) as exc:
            handle.close()
            raise StorageError(
                f'Lecture S3 impossible ({self.bucket}) : {exc}') from exc
        handle.seek(0)
        return handle

    def delete(self, relative_path: str) -> bool:
        key = self._key(relative_path)      # valide avant tout appel réseau
        if not self.exists(relative_path):
            return False
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(
                f'Suppression S3 impossible ({self.bucket}) : {exc}') from exc
        return True

    def exists(self, relative_path: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket,
                                    Key=self._key(relative_path))
        except (BotoCoreError, ClientError, StorageError):
            return False
        return True
