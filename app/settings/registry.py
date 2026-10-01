"""Registre typé des réglages : contrat d'API, validation et documentation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

VALID_TYPES = {'str', 'int', 'bool', 'list', 'choice'}

CATEGORIES = {
    'general': 'Général',
    'archives': 'Archives & documents',
    'auth': 'Authentification',
    'storage': 'Stockage',
    'notifications': 'Notifications',
    'features': 'Fonctionnalités',
}


@dataclass(frozen=True)
class SettingDefinition:
    key: str
    type: str
    default: Any
    category: str
    scope: str = 'global'
    public: bool = False
    label: str = ''
    help: str = ''
    choices: tuple[str, ...] = field(default_factory=tuple)
    min: int | None = None
    max: int | None = None

    def to_dict(self) -> dict:
        return {
            'key': self.key,
            'type': self.type,
            'default': self.default,
            'category': self.category,
            'category_label': CATEGORIES.get(self.category, self.category),
            'scope': self.scope,
            'public': self.public,
            'label': self.label,
            'help': self.help,
            'choices': list(self.choices),
            'min': self.min,
            'max': self.max,
        }


def _d(*args, **kwargs) -> SettingDefinition:
    defn = SettingDefinition(*args, **kwargs)
    if defn.type not in VALID_TYPES:
        raise ValueError(f"Réglage « {defn.key} » : type inconnu {defn.type!r}")
    if defn.scope not in ('global', 'campus'):
        raise ValueError(f"Réglage « {defn.key} » : portée invalide {defn.scope!r}")
    return defn


_DEFINITIONS: tuple[SettingDefinition, ...] = (
    _d('general.locale', 'choice', 'fr', 'general', public=True,
       label='Langue', choices=('fr', 'en'),
       help="Langue par défaut de l'interface."),
    _d('general.timezone', 'str', 'Africa/Douala', 'general', public=True,
       label='Fuseau horaire',
       help="Fuseau utilisé pour l'affichage des dates."),
    _d('general.date_format', 'choice', 'DD/MM/YYYY', 'general', public=True,
       label="Format de date", choices=('DD/MM/YYYY', 'YYYY-MM-DD'),
       help="Format d'affichage des dates."),

    _d('archives.default_confidentiality', 'choice', 'internal', 'archives',
       label='Confidentialité par défaut',
       choices=('public', 'internal', 'confidential', 'secret'),
       help="Niveau appliqué aux documents sans niveau explicite."),
    _d('archives.allowed_confidentialities', 'list',
       ['public', 'internal', 'confidential', 'secret'], 'archives',
       label='Niveaux autorisés',
       help='Niveaux de confidentialité proposés à la création.'),
    _d('archives.retention_enabled', 'bool', True, 'archives',
       label='Rétention activée',
       help="Calcule l'échéance de conservation des documents."),
    _d('archives.retention_warning_days', 'int', 30, 'archives',
       label='Préavis de fin de conservation (jours)', min=0, max=365,
       help='Nombre de jours avant échéance pour notifier.'),
    _d('archives.reference_template', 'str', '{CAMPUS}-{YEAR}-{SEQ}', 'archives',
       label='Modèle de cote',
       help='Placeholders : {CAMPUS}, {YEAR}, {SEQ}.'),
    _d('archives.matricule_template', 'str', '{ROLE}{YEAR}{SEQ}', 'archives',
       label='Modèle de matricule',
       help='Placeholders : {ROLE}, {CAMPUS}, {YEAR}, {SEQ}.'),

    _d('auth.two_factor_required', 'bool', True, 'auth',
       label='2FA obligatoire', public=True,
       help='Impose la double authentification à la connexion.'),
    _d('auth.session_ttl_seconds', 'int', 7 * 24 * 3600, 'auth',
       label='Durée de session (secondes)', min=300, max=30 * 24 * 3600,
       help='Durée de vie glissante d’une session.'),
    _d('auth.password_min_length', 'int', 8, 'auth', public=True,
       label='Longueur minimale du mot de passe', min=6, max=128),
    _d('auth.password_require_uppercase', 'bool', True, 'auth',
       label='Exiger une majuscule'),
    _d('auth.password_require_lowercase', 'bool', True, 'auth',
       label='Exiger une minuscule'),
    _d('auth.password_require_digit', 'bool', True, 'auth',
       label='Exiger un chiffre'),
    _d('auth.max_failed_attempts', 'int', 5, 'auth',
       label='Tentatives échouées avant alerte', min=1, max=100),

    _d('storage.max_upload_mb', 'int', 50, 'storage', public=True,
       label='Taille maximale d’upload (Mo)', min=1, max=2048),
    _d('storage.allowed_extensions', 'list',
       ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'], 'storage',
       public=True, label='Extensions autorisées'),
    _d('storage.local_path', 'str', 'uploads', 'storage',
       label='Chemin de stockage local',
       help='Relatif à la racine du backend.'),

    _d('notifications.email_enabled', 'bool', False, 'notifications',
       label='Notifications par email',
       help='Active les emails transactionnels (nécessite un SMTP).'),
    _d('notifications.retention_warning', 'bool', True, 'notifications',
       label='Notifier avant expiration', scope='campus'),

    _d('features.ocr_enabled', 'bool', False, 'features', public=True,
       label='OCR'),
    _d('features.scanner_enabled', 'bool', False, 'features', public=True,
       label='Numérisation scanner'),
    _d('features.bulk_export_enabled', 'bool', True, 'features',
       label='Export massif'),
    _d('features.audit_enabled', 'bool', True, 'features', public=True,
       label="Journal d'audit"),
)

REGISTRY: dict[str, SettingDefinition] = {d.key: d for d in _DEFINITIONS}

if len(REGISTRY) != len(_DEFINITIONS):
    raise RuntimeError('Clés de réglages dupliquées dans le registre.')


def definition(key: str) -> SettingDefinition:
    return REGISTRY[key]


def categories() -> list[dict]:
    present = []
    for name, label in CATEGORIES.items():
        keys = [d.key for d in _DEFINITIONS if d.category == name]
        if keys:
            present.append({'name': name, 'label': label, 'keys': keys})
    return present


def all_definitions() -> list[SettingDefinition]:
    return list(_DEFINITIONS)
