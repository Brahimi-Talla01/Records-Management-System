import csv
import io
import uuid
from datetime import datetime, timedelta

from app.documents.repositories import DocumentRepository, parse_date
from app.documents.validation import extension_of, mime_for, validate_upload
from app.errors import (NotFoundError, PermissionDeniedError, ValidationError)
from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.folder import Folder
from app.models.tag import Tag
from app.scope import is_super_admin
from app.services import audit_service
from app.services.permission_service import PermissionService
from app.settings.service import SettingService
from app.storage import get_storage
from extensions import db

CONFIDENTIALITIES = ('public', 'internal', 'confidential', 'secret')
UPDATABLE = ('title', 'description', 'folder_id', 'department_id',
             'doc_type_id', 'confidentiality_level', 'retention_period')


def _forbid(message, code):
    raise PermissionDeniedError(message, code=code)


def _int(params, key, default=None):
    value = params.get(key)
    if value in (None, ''):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class DocumentService:

    @staticmethod
    def _resolve_campus_id(actor, data, folder, department):
        explicit = data.get('campus_id')
        if explicit:
            campus_id = int(explicit)
            if not is_super_admin(actor) and campus_id != actor.campus_id:
                _forbid("Accès inter-campus interdit.", 'cross_campus_access')
            return campus_id
        if folder is not None and folder.campus_id is not None:
            return folder.campus_id
        if department is not None:
            return department.campus_id
        if is_super_admin(actor) and actor.campus_id is None:
            raise ValidationError("campus_id requis pour un administrateur global.",
                                  code='missing_campus')
        return actor.campus_id

    @staticmethod
    def _confidentiality(value, campus_id):
        default = SettingService.effective('archives.default_confidentiality', campus_id)
        value = value or default
        allowed = SettingService.effective('archives.allowed_confidentialities', campus_id)
        if value not in allowed:
            raise ValidationError(
                f"Niveau de confidentialité invalide : {value}",
                code='invalid_confidentiality',
                details={'allowed': allowed},
            )
        return value

    @staticmethod
    def _retention_days(doc_type, data):
        if data.get('retention_period') is not None:
            return int(data['retention_period'])
        return doc_type.default_retention_days

    @staticmethod
    def _expiry(created_at, days, campus_id):
        if days is None:
            return None
        if not SettingService.effective('archives.retention_enabled', campus_id):
            return None
        return created_at + timedelta(days=int(days))

    @staticmethod
    def _campus_code(campus_id):
        campus = Campus.query.get(campus_id)
        return campus.code if campus else 'GLOBAL'

    @staticmethod
    def _folder_or_404(folder_id):
        if folder_id in (None, ''):
            return None
        folder = Folder.query.get(int(folder_id))
        if folder is None:
            raise ValidationError("Dossier introuvable.", code='folder_not_found')
        return folder

    @staticmethod
    def _department_or_404(department_id):
        if department_id in (None, ''):
            return None
        department = Department.query.get(int(department_id))
        if department is None:
            raise ValidationError("Département introuvable.",
                                  code='department_not_found')
        return department

    @staticmethod
    def _doc_type_or_404(doc_type_id):
        doc_type = DocType.query.get(int(doc_type_id)) if doc_type_id else None
        if doc_type is None:
            raise ValidationError("Type de document introuvable.",
                                  code='doc_type_not_found')
        return doc_type

    @staticmethod
    def _require_view(actor, document):
        if not PermissionService.can_view_document(actor, document):
            _forbid("Accès au document interdit.", 'document_forbidden')

    @staticmethod
    def _require(actor, document, action):
        allowed, reason = PermissionService.explain(actor, document, action)
        if not allowed:
            _forbid("Action non autorisée sur ce document.",
                    'document_forbidden')

    @staticmethod
    def list_documents(actor, params, max_per_page=100):
        filters = {
            'q': params.get('q'),
            'folder_id': _int(params, 'folder_id'),
            'department_id': _int(params, 'department_id'),
            'doc_type_id': _int(params, 'doc_type_id'),
            'confidentiality': params.get('confidentiality'),
            'created_from': parse_date(params.get('created_from')),
            'created_to': parse_date(params.get('created_to')),
            'sort': params.get('sort'),
            'order': params.get('order'),
        }
        filters['status'] = params.get('status') or 'active'

        if is_super_admin(actor):
            filters['campus_id'] = _int(params, 'campus_id')
        else:
            if actor.campus_id is None:
                _forbid("Aucun campus associé à ce compte.", 'no_campus_scope')
            filters['campus_id'] = actor.campus_id

        tag_ids = params.get('tag_ids')
        if tag_ids:
            filters['tag_ids'] = [int(t) for t in str(tag_ids).split(',') if t.strip()]

        page = _int(params, 'page', 1) or 1
        per_page = _int(params, 'per_page', 20) or 20
        pagination = DocumentRepository.search(filters, page,
                                               min(max(per_page, 1), max_per_page))
        return {
            'items': [d.to_dict() for d in pagination.items],
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
        }

    @staticmethod
    def get_document(actor, document_id):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        DocumentService._require_view(actor, document)
        return document

    @staticmethod
    def create_document(actor, data, file=None):
        if not data.get('title'):
            raise ValidationError("Le titre est requis.", code='missing_title')
        doc_type = DocumentService._doc_type_or_404(data.get('doc_type_id'))
        folder = DocumentService._folder_or_404(data.get('folder_id'))
        department = DocumentService._department_or_404(data.get('department_id'))
        campus_id = DocumentService._resolve_campus_id(actor, data, folder, department)

        if department is not None and department.campus_id != campus_id:
            raise ValidationError("Le département n'appartient pas à ce campus.",
                                  code='campus_mismatch')
        if folder is not None and folder.campus_id not in (None, campus_id):
            raise ValidationError("Le dossier n'appartient pas à ce campus.",
                                  code='campus_mismatch')

        if file is not None and file.filename:
            validate_upload(file)

        created_at = datetime.utcnow()
        days = DocumentService._retention_days(doc_type, data)
        document = Document(
            title=data['title'],
            description=data.get('description'),
            campus_id=campus_id,
            folder_id=folder.folder_id if folder else None,
            department_id=department.department_id if department else None,
            doc_type_id=doc_type.doc_type_id,
            confidentiality_level=DocumentService._confidentiality(
                data.get('confidentiality_level'), campus_id),
            retention_period=days,
            retention_expires_at=DocumentService._expiry(created_at, days, campus_id),
        )
        db.session.add(document)
        db.session.commit()
        audit_service.log('document_created', 'document', object_id=document.document_id,
                          details={'title': document.title, 'campus_id': campus_id},
                          user_id=actor.user_id)

        if file is not None and file.filename:
            DocumentService._store_version(actor, document, file,
                                           data.get('change_note'))
        return document

    @staticmethod
    def update_document(actor, document_id, data):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        DocumentService._require(actor, document, 'edit')

        if 'doc_type_id' in data:
            document.doc_type_id = DocumentService._doc_type_or_404(
                data['doc_type_id']).doc_type_id
        if 'folder_id' in data:
            folder = DocumentService._folder_or_404(data['folder_id'])
            if folder is not None and folder.campus_id not in (None, document.campus_id):
                raise ValidationError("Le dossier n'appartient pas à ce campus.",
                                      code='campus_mismatch')
            document.folder_id = folder.folder_id if folder else None
        if 'department_id' in data:
            department = DocumentService._department_or_404(data['department_id'])
            if department is not None and department.campus_id != document.campus_id:
                raise ValidationError("Le département n'appartient pas à ce campus.",
                                      code='campus_mismatch')
            document.department_id = department.department_id if department else None
        if 'confidentiality_level' in data:
            document.confidentiality_level = DocumentService._confidentiality(
                data['confidentiality_level'], document.campus_id)
        if 'retention_period' in data:
            document.retention_period = (int(data['retention_period'])
                                         if data['retention_period'] is not None else None)
            document.retention_expires_at = DocumentService._expiry(
                document.created_at, document.retention_period, document.campus_id)
        for field in ('title', 'description'):
            if field in data:
                setattr(document, field, data[field])

        document.updated_at = datetime.utcnow()
        db.session.commit()
        audit_service.log('document_updated', 'document', object_id=document.document_id,
                          details={'fields': list(data.keys())}, user_id=actor.user_id)
        return document

    @staticmethod
    def soft_delete(actor, document_id):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        DocumentService._require(actor, document, 'delete')
        document.status = 'deleted'
        document.deleted_by = actor.user_id
        db.session.commit()
        audit_service.log('document_deleted', 'document', object_id=document.document_id,
                          user_id=actor.user_id)
        return document

    @staticmethod
    def restore(actor, document_id):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        DocumentService._require(actor, document, 'edit')
        document.status = 'active'
        document.deleted_by = None
        db.session.commit()
        audit_service.log('document_restored', 'document', object_id=document.document_id,
                          user_id=actor.user_id)
        return document

    @staticmethod
    def bulk(actor, data):
        ids = data.get('ids') or []
        action = data.get('action')
        updated = []
        for document in DocumentRepository.by_ids(ids):
            if not is_super_admin(actor) and document.campus_id != actor.campus_id:
                _forbid("Accès inter-campus interdit.", 'cross_campus_access')
            if action == 'delete':
                DocumentService.soft_delete(actor, document.document_id)
            elif action == 'restore':
                DocumentService.restore(actor, document.document_id)
            elif action == 'move':
                DocumentService.update_document(actor, document.document_id,
                                                {'folder_id': data.get('folder_id')})
            elif action == 'confidentiality':
                DocumentService.update_document(
                    actor, document.document_id,
                    {'confidentiality_level': data.get('confidentiality')})
            else:
                raise ValidationError("Action groupée inconnue.", code='unknown_bulk_action')
            updated.append(document.document_id)
        return updated

    @staticmethod
    def _store_version(actor, document, file, change_note=None):
        ext = validate_upload(file)
        last = (db.session.query(db.func.max(DocumentVersion.version_number))
                .filter(DocumentVersion.document_id == document.document_id).scalar())
        version_number = (last or 0) + 1
        now = datetime.utcnow()
        relative = (f"{DocumentService._campus_code(document.campus_id)}/"
                    f"{now:%Y}/{now:%m}/"
                    f"v{version_number}_{uuid.uuid4().hex[:8]}.{ext}")
        result = get_storage().save(relative, file.stream)

        version = DocumentVersion(
            document_id=document.document_id,
            version_number=version_number,
            storage_url=result['path'],
            mime_type=file.mimetype or mime_for(ext),
            checksum=result['checksum'],
            change_note=change_note,
            uploaded_by=actor.user_id,
        )
        db.session.add(version)
        document.size_bytes = result['size']
        db.session.commit()
        audit_service.log('document_version_added', 'document',
                          object_id=document.document_id,
                          details={'version': version_number},
                          user_id=actor.user_id)
        return version

    @staticmethod
    def add_version(actor, document_id, file, change_note=None):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        DocumentService._require(actor, document, 'edit')
        if file is None or not file.filename:
            raise ValidationError("Aucun fichier fourni.", code='missing_file')
        return DocumentService._store_version(actor, document, file, change_note)

    @staticmethod
    def list_versions(actor, document_id):
        document = DocumentService.get_document(actor, document_id)
        versions = (DocumentVersion.query
                    .filter_by(document_id=document.document_id)
                    .order_by(DocumentVersion.version_number.desc()).all())
        return versions

    @staticmethod
    def _version(actor, document, version_id, action='view'):
        DocumentService._require(actor, document, action)
        version = DocumentVersion.query.filter_by(
            version_id=version_id, document_id=document.document_id).first()
        if version is None:
            raise NotFoundError("Version introuvable.", code='version_not_found')
        return version

    @staticmethod
    def version_file(actor, document_id, version_id, action='download'):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        version = DocumentService._version(actor, document, version_id, action)
        storage = get_storage()
        if not storage.exists(version.storage_url):
            raise NotFoundError("Fichier introuvable sur le stockage.",
                                code='file_missing')
        return document, version

    @staticmethod
    def latest_version(actor, document_id):
        document = DocumentService.get_document(actor, document_id)
        version = (DocumentVersion.query.filter_by(document_id=document.document_id)
                   .order_by(DocumentVersion.version_number.desc()).first())
        if version is None:
            raise NotFoundError("Aucune version pour ce document.",
                                code='version_not_found')
        return document, version

    @staticmethod
    def restore_version(actor, document_id, version_id):
        document = DocumentRepository.get(document_id)
        if document is None:
            raise NotFoundError("Document introuvable.", code='document_not_found')
        source = DocumentService._version(actor, document, version_id, 'edit')
        last = (db.session.query(db.func.max(DocumentVersion.version_number))
                .filter(DocumentVersion.document_id == document.document_id).scalar())
        version = DocumentVersion(
            document_id=document.document_id,
            version_number=(last or 0) + 1,
            storage_url=source.storage_url,
            mime_type=source.mime_type,
            checksum=source.checksum,
            change_note=f"Restauration de la version {source.version_number}",
            uploaded_by=actor.user_id,
        )
        db.session.add(version)
        db.session.commit()
        audit_service.log('document_version_restored', 'document',
                          object_id=document.document_id,
                          details={'from_version': source.version_number},
                          user_id=actor.user_id)
        return version

    @staticmethod
    def add_tags(actor, document_id, names):
        document = DocumentService.get_document(actor, document_id)
        DocumentService._require(actor, document, 'edit')
        for name in names:
            name = (name or '').strip()
            if not name:
                continue
            tag = Tag.query.filter_by(name=name).first()
            if tag is None:
                tag = Tag(name=name)
                db.session.add(tag)
            document.tags.append(tag)
        db.session.commit()
        audit_service.log('document_tagged', 'document', object_id=document.document_id,
                          details={'tags': names}, user_id=actor.user_id)
        return document

    @staticmethod
    def remove_tags(actor, document_id, names):
        document = DocumentService.get_document(actor, document_id)
        DocumentService._require(actor, document, 'edit')
        for name in names:
            tag = Tag.query.filter_by(name=(name or '').strip()).first()
            if tag is not None and tag in document.tags.all():
                document.tags.remove(tag)
        db.session.commit()
        audit_service.log('document_untagged', 'document', object_id=document.document_id,
                          details={'tags': names}, user_id=actor.user_id)
        return document

    @staticmethod
    def export_csv(actor, params):
        params = dict(params)
        params['per_page'] = 10000
        result = DocumentService.list_documents(actor, params, max_per_page=10000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Titre', 'Type', 'Département', 'Campus',
                         'Statut', 'Confidentialité', 'Taille', 'Créé le'])
        for item in result['items']:
            writer.writerow([
                item['document_id'], item['title'], item['doc_type_id'],
                item['department_id'], item['campus_id'], item['status'],
                item['confidentiality_level'], item['size_bytes'],
                item['created_at'],
            ])
        return output.getvalue()


def safe_download_name(document, version):
    ext = extension_of(version.storage_url) or 'bin'
    return f"document-{document.document_id}-v{version.version_number}.{ext}"
