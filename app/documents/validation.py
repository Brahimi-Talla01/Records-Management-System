from flask import current_app

from app.errors import UnprocessableEntityError

SIGNATURES = {
    'pdf': (b'%PDF',),
    'png': (b'\x89PNG\r\n\x1a\n',),
    'jpg': (b'\xff\xd8\xff',),
    'jpeg': (b'\xff\xd8\xff',),
    'tiff': (b'II*\x00', b'MM\x00*'),
    'docx': (b'PK\x03\x04',),
    'xlsx': (b'PK\x03\x04',),
    'doc': (b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',),
}


def allowed_extensions() -> set:
    return set(current_app.config['ALLOWED_EXTENSIONS'])


def extension_of(filename: str) -> str:
    if not filename or '.' not in filename:
        return ''
    return filename.rsplit('.', 1)[-1].lower()


def validate_upload(file_storage) -> str:
    filename = file_storage.filename or ''
    ext = extension_of(filename)
    if not ext:
        raise UnprocessableEntityError("Le fichier doit avoir une extension.",
                                       code='missing_extension')

    if ext not in allowed_extensions():
        raise UnprocessableEntityError(
            f"Extension « {ext} » non autorisée.",
            code='extension_not_allowed',
            details={'extension': ext, 'allowed': sorted(allowed_extensions())},
        )

    header = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    signatures = SIGNATURES.get(ext)
    if signatures and not any(header.startswith(sig) for sig in signatures):
        raise UnprocessableEntityError(
            "Le contenu du fichier ne correspond pas à son extension.",
            code='invalid_file_signature', details={'extension': ext},
        )
    return ext


def mime_for(ext: str) -> str:
    return {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'tiff': 'image/tiff',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }.get(ext, 'application/octet-stream')
