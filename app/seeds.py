"""
Seeds de base idempotents (plan07 — P0.6).

Chaque fonction ne crée que ce qui manque et retourne le nombre de lignes
insérées (0 = déjà en place). Une cible appelle les cibles dont elle dépend,
de sorte que `seed admin` fonctionne aussi sur une base vide.

Exécution :
    flask seed all            # tout
    flask seed roles|folders|doctypes|departments|admin|demo
    python init_db.py         # équivalent historique (conteneur / dev manuel)
"""

from extensions import db
from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.folder import Folder
from app.models.institution import Institution
from app.models.role import Role
from app.models.setting import Setting
from app.models.user import UserAccount

# ---------------------------------------------------------------------------
# Contenu de référence (identique à l'historique init_db.py)
# ---------------------------------------------------------------------------

ROLES = [
    ('Admin', 'Administrateur système avec tous les droits'),
    ('Prof', 'Professeur avec accès aux documents académiques'),
    ('Etudiant', 'Étudiant avec accès limité'),
    ('Secretaire', 'Secrétaire avec accès administratif'),
]

DOC_TYPES = [
    ('Thèse', 'Thèse de doctorat', 3650),
    ('Mémoire', 'Mémoire de master', 1825),
    ('Rapport', 'Rapport de stage ou projet', 730),
    ('Article', 'Article scientifique', 1825),
    ('Cours', 'Support de cours', 1095),
    ('Administratif', 'Document administratif', 2555),
]

FOLDERS = [
    'Archives Académiques',
    'Documents Administratifs',
    'Bibliothèque Numérique',
    'Thèses et Mémoires',
]

# (nom, code, description, dossier racine rattaché ou None)
DEPARTMENTS = [
    ('Informatique', 'INFO', "Département d'Informatique et Sciences du Numérique",
     'Documents Administratifs'),
    ('Mathématiques', 'MATH', 'Département de Mathématiques et Statistiques', None),
    ('Physique', 'PHYS', 'Département de Physique', None),
    ('Administration', 'ADMIN', "Administration générale de l'université", None),
]

DEFAULT_ADMIN = {
    'matricule': 'ADMIN001',
    'username': 'admin',
    'email': 'admin@uniarchive.edu',
    'full_name': 'Administrateur Principal',
    'password': 'Admin@2024',
}

DEFAULT_CAMPUS = {
    'code': 'PRINCIPAL',
    'name': 'Campus principal',
    'city': None,
}

DEFAULT_INSTITUTION = {
    'name': 'Mon établissement',
    'short_name': None,
    'locale': 'fr',
    'timezone': 'Africa/Douala',
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _existing(model, column, values):
    """Ensemble des valeurs déjà présentes en base pour une colonne donnée."""
    rows = db.session.query(getattr(model, column)).filter(
        getattr(model, column).in_(values)
    ).all()
    return {row[0] for row in rows}


# ---------------------------------------------------------------------------
# Cibles
# ---------------------------------------------------------------------------

def seed_institution() -> int:
    """Crée la ligne unique de profil de l'établissement (1 si créée, 0 sinon)."""
    if Institution.get() is not None:
        return 0
    institution = Institution(institution_id=1, **DEFAULT_INSTITUTION)
    db.session.add(institution)
    db.session.commit()
    return 1


def seed_campuses() -> int:
    """Crée le campus principal (idempotent)."""
    existing = Campus.query.filter_by(code=DEFAULT_CAMPUS['code']).first()
    if existing is not None:
        return 0
    campus = Campus(**DEFAULT_CAMPUS)
    db.session.add(campus)
    db.session.commit()
    return 1


def seed_settings() -> int:
    """Inscrit les réglages globaux d'usine à partir du registre typé."""
    from app.settings.registry import REGISTRY

    present = _existing_setting_keys()
    to_create = [
        Setting(key=key, scope='global', campus_id=None, value=defn.default)
        for key, defn in REGISTRY.items() if key not in present
    ]
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def _existing_setting_keys() -> set:
    rows = db.session.query(Setting.key).filter_by(scope='global').all()
    return {row[0] for row in rows}


def seed_roles() -> int:
    """Crée les 4 rôles standards. Retourne le nombre de rôles créés."""
    present = _existing(Role, 'name', [name for name, _ in ROLES])
    to_create = [Role(name=name, description=desc)
                 for name, desc in ROLES if name not in present]
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def seed_folders() -> int:
    """Crée les dossiers racine. Retourne le nombre de dossiers créés."""
    present = _existing(Folder, 'name', FOLDERS)
    to_create = [Folder(name=name) for name in FOLDERS if name not in present]
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def seed_doctypes() -> int:
    """Crée les types de documents (avec leur rétention par défaut)."""
    present = _existing(DocType, 'name', [name for name, _, _ in DOC_TYPES])
    to_create = [
        DocType(name=name, description=desc, default_retention_days=days)
        for name, desc, days in DOC_TYPES if name not in present
    ]
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def seed_departments() -> int:
    """Crée les départements rattachés au campus principal (dépend des dossiers)."""
    seed_folders()
    seed_campuses()
    campus = Campus.query.filter_by(code=DEFAULT_CAMPUS['code']).first()
    if campus is None:  # pragma: no cover — seed_campuses vient de le créer
        raise RuntimeError('Campus principal introuvable après seed.')
    present = _existing(Department, 'code', [code for _, code, _, _ in DEPARTMENTS])
    to_create = []
    for name, code, description, folder_name in DEPARTMENTS:
        if code in present:
            continue
        folder = Folder.query.filter_by(name=folder_name).first() if folder_name else None
        to_create.append(Department(
            name=name,
            code=code,
            description=description,
            folder_id=folder.folder_id if folder else None,
            campus_id=campus.campus_id,
        ))
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def seed_admin(username=DEFAULT_ADMIN['username'],
               password=DEFAULT_ADMIN['password'],
               matricule=None,
               email=None) -> int:
    """
    Crée le compte administrateur initial (1 si créé, 0 s'il existe déjà).

    Dépend des rôles et du département ADMIN : ces seeds sont appelés en amont.
    """
    seed_roles()
    seed_departments()

    if UserAccount.query.filter_by(username=username).first() is not None:
        return 0

    admin_role = Role.query.filter_by(name='Admin').first()
    admin_dept = Department.query.filter_by(code='ADMIN').first()
    if admin_role is None or admin_dept is None:
        raise RuntimeError(
            "Seed incomplet : rôle 'Admin' ou département 'ADMIN' introuvable."
        )

    admin_user = UserAccount(
        matricule=matricule or DEFAULT_ADMIN['matricule'],
        username=username,
        email=email or DEFAULT_ADMIN['email'],
        full_name=DEFAULT_ADMIN['full_name'],
        role_id=admin_role.role_id,
        department_id=admin_dept.department_id,
        campus_id=None,
        is_active=True,
    )
    admin_user.set_password(password)
    db.session.add(admin_user)
    db.session.commit()
    return 1


def seed_demo() -> int:
    """
    Comptes de démonstration (prof / secrétaire / étudiant) branchés sur le
    département INFO — utiles pour les tests manuels et la démo.

    Retourne le nombre de comptes créés.
    """
    seed_roles()
    seed_departments()
    campus = Campus.query.filter_by(code=DEFAULT_CAMPUS['code']).first()

    role_names = ['Prof', 'Secretaire', 'Etudiant']
    # Les logins sont en minuscules ('prof'…) : la vérification doit porter sur
    # les usernames, pas sur les noms de rôles — sinon 2e passage => IntegrityError.
    usernames = [role_name.lower() for role_name in role_names]
    present = _existing(UserAccount, 'username', usernames)
    to_create = []
    info = Department.query.filter_by(code='INFO').first()
    for role_name in role_names:
        login = role_name.lower()
        if login in present:
            continue
        role = Role.query.filter_by(name=role_name).first()
        if role is None:  # pragma: no cover - seed_roles garantit les rôles
            continue
        user = UserAccount(
            matricule=f'{role_name.upper()}001',
            username=login,
            email=f'{login}@uniarchive.edu',
            full_name=f'{role_name} (démo)',
            role_id=role.role_id,
            department_id=info.department_id if info else None,
            campus_id=campus.campus_id if campus else None,
            is_active=True,
        )
        user.set_password('Demo@2024')
        to_create.append(user)

    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


SEEDS = {
    'institution': seed_institution,
    'campuses': seed_campuses,
    'settings': seed_settings,
    'roles': seed_roles,
    'folders': seed_folders,
    'doctypes': seed_doctypes,
    'departments': seed_departments,
    'admin': seed_admin,
    'demo': seed_demo,
}


def seed_all(username=None, password=None) -> dict:
    """Exécute toutes les cibles dans l'ordre de dépendance."""
    return {
        'institution': seed_institution(),
        'campuses': seed_campuses(),
        'settings': seed_settings(),
        'roles': seed_roles(),
        'folders': seed_folders(),
        'doctypes': seed_doctypes(),
        'departments': seed_departments(),
        'admin': seed_admin(username=username or DEFAULT_ADMIN['username'],
                            password=password or DEFAULT_ADMIN['password']),
        'demo': seed_demo(),
    }
