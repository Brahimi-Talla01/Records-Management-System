"""
Importation centralisée de tous les modèles.
L'ordre est CRITIQUE pour respecter les dépendances des clés étrangères.
"""

# 0. Institution & Campus (sans dépendances)
from app.models.institution import Institution
from app.models.campus import Campus

# 1. Modèles de base SANS dépendances
from app.models.role import Role
from app.models.tag import Tag
from app.models.doc_type import DocType

# 2. Folder (dépend de Campus, auto-référence)
from app.models.folder import Folder

# 3. Department (dépend de Folder et Campus)
from app.models.department import Department

# 4. UserAccount (dépend de Role et Department) - DOIT ÊTRE AVANT Notification
from app.models.user import UserAccount

# 5. Document (dépend de Department, DocType, Folder)
from app.models.document import Document

# 6. Modèles qui dépendent de UserAccount et/ou Document
from app.models.notification import Notification
from app.models.search_history import SearchHistory
from app.models.document_version import DocumentVersion
from app.models.audit import AuditLog

# 7. Tables d'association et de droits
from app.models.document_tag import document_tag
from app.models.user_document_right import UserDocumentRight
from app.models.user_folder_right import UserFolderRight
from app.models.role_document_right import RoleDocumentRight
from app.models.role_folder_right import RoleFolderRight

# 8. Modèles d'authentification (dépendent de UserAccount)
from app.models.password_reset import PasswordResetToken
from app.models.two_factor import TwoFactorCode
from app.models.security_alert import SecurityAlert

# 9. Réglages (dépendent de Campus et UserAccount)
from app.models.setting import Setting

__all__ = [
    'Institution',
    'Campus',
    'Role',
    'Tag',
    'DocType',
    'Folder',
    'Department',
    'UserAccount',
    'Document',
    'Notification',
    'SearchHistory',
    'DocumentVersion',
    'AuditLog',
    'document_tag',
    'UserDocumentRight',
    'UserFolderRight',
    'RoleDocumentRight',
    'RoleFolderRight',
    'PasswordResetToken',
    'TwoFactorCode',
    'SecurityAlert',
    'Setting',
]