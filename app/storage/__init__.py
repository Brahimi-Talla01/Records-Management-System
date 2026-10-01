from flask import current_app

from app.storage.base import Storage, StorageError
from app.storage.local import LocalStorage


def get_storage() -> Storage:
    backend = current_app.config.get('STORAGE_BACKEND', 'local')
    if backend == 'local':
        return LocalStorage(current_app.config['UPLOAD_FOLDER'])
    if backend == 's3':
        from app.storage.s3 import S3Storage
        return S3Storage(
            bucket=current_app.config['S3_BUCKET'],
            client=_s3_client(),
            prefix=current_app.config.get('S3_PREFIX', ''),
        )
    raise StorageError(f'Backend de stockage inconnu : {backend}')


def _s3_client():
    """Client boto3 : création sans accès réseau (les requêtes viennent ensuite)."""
    import boto3
    from botocore.config import Config as BotoConfig
    cfg = current_app.config
    options = {
        'endpoint_url': cfg.get('S3_ENDPOINT_URL') or None,
        'region_name': cfg.get('S3_REGION') or None,
        'aws_access_key_id': cfg.get('S3_ACCESS_KEY') or None,
        'aws_secret_access_key': cfg.get('S3_SECRET_KEY') or None,
    }
    if cfg.get('S3_FORCE_PATH_STYLE'):
        options['config'] = BotoConfig(s3={'addressing_style': 'path'})
    return boto3.client('s3', **options)


__all__ = ['Storage', 'StorageError', 'LocalStorage', 'get_storage']
