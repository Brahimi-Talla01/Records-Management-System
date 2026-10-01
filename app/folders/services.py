from sqlalchemy import or_

from app.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from app.models.document import Document
from app.models.folder import Folder
from app.scope import is_super_admin
from app.services import audit_service
from extensions import db


class FolderService:

    @staticmethod
    def _campus_id(actor, data):
        if is_super_admin(actor):
            return int(data['campus_id']) if data.get('campus_id') else None
        if actor.campus_id is None:
            raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                        code='no_campus_scope')
        return actor.campus_id

    @staticmethod
    def list_folders(actor, params):
        query = Folder.query
        if not is_super_admin(actor):
            if actor.campus_id is None:
                raise PermissionDeniedError("Aucun campus associé à ce compte.",
                                            code='no_campus_scope')
            query = query.filter(or_(Folder.campus_id == actor.campus_id,
                                     Folder.campus_id.is_(None)))
        elif params.get('campus_id'):
            query = query.filter(Folder.campus_id == int(params['campus_id']))
        if params.get('department_id'):
            query = query.filter(Folder.department.has(
                department_id=int(params['department_id'])))
        if params.get('parent_id') is not None and params.get('parent_id') != '':
            query = query.filter(Folder.parent_folder_id == int(params['parent_id']))
        folders = query.order_by(Folder.name).all()
        if params.get('view') == 'tree':
            return FolderService._tree(folders)
        return [f.to_dict() for f in folders]

    @staticmethod
    def _tree(folders):
        nodes = {f.folder_id: {**f.to_dict(), 'subfolders': []} for f in folders}
        roots = []
        for folder in folders:
            node = nodes[folder.folder_id]
            parent = nodes.get(folder.parent_folder_id)
            if parent is None:
                roots.append(node)
            else:
                parent['subfolders'].append(node)
        return roots

    @staticmethod
    def get_folder(actor, folder_id):
        folder = Folder.query.get(folder_id)
        if folder is None:
            raise NotFoundError("Dossier introuvable.", code='folder_not_found')
        if not is_super_admin(actor) and folder.campus_id not in (None, actor.campus_id):
            raise PermissionDeniedError("Accès inter-campus interdit.",
                                        code='cross_campus_access')
        return folder

    @staticmethod
    def path(actor, folder_id):
        folder = FolderService.get_folder(actor, folder_id)
        chain = []
        while folder is not None:
            chain.append(folder.to_dict())
            folder = folder.parent
        return list(reversed(chain))

    @staticmethod
    def create_folder(actor, data):
        name = (data.get('name') or '').strip()
        if not name:
            raise ValidationError("Le nom du dossier est requis.",
                                  code='missing_folder_name')
        parent = None
        if data.get('parent_folder_id'):
            parent = Folder.query.get(int(data['parent_folder_id']))
            if parent is None:
                raise ValidationError("Dossier parent introuvable.",
                                      code='parent_not_found')
        campus_id = FolderService._campus_id(actor, data)
        if parent is not None and parent.campus_id is not None:
            campus_id = parent.campus_id

        folder = Folder(name=name, parent_folder_id=parent.folder_id if parent else None,
                        campus_id=campus_id)
        db.session.add(folder)
        db.session.commit()
        audit_service.log('folder_created', 'folder', object_id=folder.folder_id,
                          details={'name': folder.name}, user_id=actor.user_id)
        return folder

    @staticmethod
    def update_folder(actor, folder_id, data):
        folder = FolderService.get_folder(actor, folder_id)
        if 'name' in data:
            name = (data.get('name') or '').strip()
            if not name:
                raise ValidationError("Le nom du dossier est requis.",
                                      code='missing_folder_name')
            folder.name = name
        if 'parent_folder_id' in data:
            FolderService._move(folder, data.get('parent_folder_id'))
        db.session.commit()
        audit_service.log('folder_updated', 'folder', object_id=folder.folder_id,
                          details={'fields': list(data.keys())}, user_id=actor.user_id)
        return folder

    @staticmethod
    def move_folder(actor, folder_id, parent_folder_id):
        folder = FolderService.get_folder(actor, folder_id)
        FolderService._move(folder, parent_folder_id)
        db.session.commit()
        audit_service.log('folder_moved', 'folder', object_id=folder.folder_id,
                          details={'parent_folder_id': folder.parent_folder_id},
                          user_id=actor.user_id)
        return folder

    @staticmethod
    def _move(folder, parent_folder_id):
        if parent_folder_id in (None, ''):
            folder.parent_folder_id = None
            return
        parent = Folder.query.get(int(parent_folder_id))
        if parent is None:
            raise ValidationError("Dossier parent introuvable.",
                                  code='parent_not_found')
        if parent.folder_id == folder.folder_id:
            raise ConflictError("Un dossier ne peut pas être son propre parent.",
                                code='folder_cycle')
        ancestor = parent
        while ancestor is not None:
            if ancestor.folder_id == folder.folder_id:
                raise ConflictError("Déplacement impossible : cycle d'arborescence.",
                                    code='folder_cycle')
            ancestor = ancestor.parent
        folder.parent_folder_id = parent.folder_id

    @staticmethod
    def delete_folder(actor, folder_id):
        folder = FolderService.get_folder(actor, folder_id)
        children = Folder.query.filter_by(parent_folder_id=folder.folder_id).count()
        documents = Document.query.filter_by(folder_id=folder.folder_id).count()
        if children or documents:
            raise ConflictError(
                "Dossier non vide : déplacez ou supprimez son contenu.",
                code='folder_not_empty',
                details={'children': children, 'documents': documents},
            )
        db.session.delete(folder)
        db.session.commit()
        audit_service.log('folder_deleted', 'folder', object_id=folder_id,
                          user_id=actor.user_id)
        return True
