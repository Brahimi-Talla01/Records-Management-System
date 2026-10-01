from flask import current_app

from app.storage.base import Storage, StorageError
from app.storage.local import LocalStorage


def get_storage() -> Storage:
    backend = current_app.config.get('STORAGE_BACKEND', 'local')
    if backend == 'local':
        return LocalStorage(current_app.config['UPLOAD_FOLDER'])
    raise StorageError(f'Backend de stockage inconnu : {backend}')


__all__ = ['Storage', 'StorageError', 'LocalStorage', 'get_storage']
