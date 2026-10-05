"""
Jeu de données de démonstration (plan 07 — P5) : documents de démo attachés à
de vrais fichiers PDF générés (pas des blobs binaires arbitraires).

Idempotent : chaque document n'est créé que si aucun DocumentVersion ne porte
sa clé de stockage. Les fichiers sont écrits via le service de stockage actif
(local en dev, S3/MinIO si configuré) et le contenu PDF est minimal mais
valide (les visionneuses l'affichent, l'OCR/le full-text ont au moins du sens).

Exécution :
    flask seed demo-data              # jeu de démonstration
    SEED_DEMO_DATA=true docker ...    # exécuté au démarrage du conteneur

Ce jeu est INADAPTÉ à la production : `seed demo-data` le refuse quand
FLASK_ENV=production (garde contournable en CLI par --force si besoin réel).
"""

import datetime as dt
import io
import uuid

from extensions import db
from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.folder import Folder
from app.models.tag import Tag
from app.models.user import UserAccount
from app.storage import get_storage

DEMO_TAG_NAMES = ['Pédagogie', 'Recherche', 'Vie étudiante', 'Administratif']

# (titre, description, doc_type, département, dossier, confidentialité,
#  tags, jours de rétention, contenu)
DEMO_DOCUMENTS = [
    (
        "Rapport annuel 2024 du département Informatique",
        "Bilan pédagogique et administratif du département pour l'année "
        "académique 2023-2024 : effectifs, taux de réussite, projets.",
        'Rapport', 'INFO', 'Documents Administratifs', 'internal',
        ['Administratif'], 1825,
        "Rapport annuel du département Informatique\n"
        "Année académique 2023-2024\n\n"
        "Effectifs : 850 étudiants inscrits, 120 diplômés.\n"
        "Taux de réussite licence : 78 %, master : 71 %.\n"
        "Projets phares : laboratoire IA appliquée, partenariat industriel.\n",
    ),
    (
        "Charte de la bibliothèque universitaire",
        "Règles de prêt, d'accès aux espaces et de conservation des ouvrages.",
        'Administratif', 'ADMIN', 'Bibliothèque Numérique', 'public',
        ['Vie étudiante'], 2555,
        "Charte de la bibliothèque universitaire\n\n"
        "1. Accès libre aux étudiants et personnels sur présentation de la\n"
        "   carte universitaire.\n"
        "2. Prêt standard : 14 jours, renouvelable deux fois.\n"
        "3. Ouvrages de référence : consultation sur place uniquement.\n",
    ),
    (
        "Cours — Introduction aux bases de données (L2)",
        "Support du chapitre 1 : modèle relationnel, algèbre relationnelle et "
        "SQL de base.",
        'Cours', 'INFO', 'Archives Académiques', 'internal',
        ['Pédagogie', 'Recherche'], 1095,
        "Introduction aux bases de données — Chapitre 1\n\n"
        "1. Le modèle relationnel : relations, attributs, domaines.\n"
        "2. Clés primaires et étrangères.\n"
        "3. Algèbre relationnelle : sélection, projection, jointure.\n"
        "4. SQL : SELECT, INSERT, UPDATE, DELETE.\n",
    ),
    (
        "Thèse — Fouille de données appliquée à la santé",
        "Thèse de doctorat : extraction de motifs fréquents dans les dossiers "
        "patients anonymisés.",
        'Thèse', 'INFO', 'Thèses et Mémoires', 'internal',
        ['Recherche'], 3650,
        "Fouille de données appliquée à la santé\n\n"
        "Résumé : cette thèse étudie l'extraction de motifs fréquents dans\n"
        "les dossiers patients anonymisés, avec une attention particulière\n"
        "pour la protection de la vie privée (k-anonymat, differential\n"
        "privacy).\n",
    ),
    (
        "Mémoire — Gestion électronique des archives",
        "Mémoire de master : comparaison des solutions de GE pour une "
        "université multi-campus.",
        'Mémoire', 'INFO', 'Thèses et Mémoires', 'internal',
        ['Recherche', 'Pédagogie'], 1825,
        "Gestion électronique des archives universitaires\n\n"
        "Ce mémoire compare les solutions de gestion électronique adaptées\n"
        "à une université multi-campus : indexation, recherche plein texte,\n"
        "rétention légale et architecture cible.\n",
    ),
    (
        "Note de service — Calendrier des examens",
        "Calendrier officiel des examens du semestre 1, à afficher et diffuser.",
        'Administratif', 'ADMIN', 'Documents Administratifs', 'internal',
        ['Vie étudiante', 'Administratif'], 730,
        "Note de service — Calendrier des examens du semestre 1\n\n"
        "Les examens se déroulent du 3 au 21 du mois en cours.\n"
        "Convocations individuelles : 10 jours avant chaque épreuve.\n",
    ),
]


class DemoDataError(RuntimeError):
    """Le jeu de démonstration n'a pas pu être installé."""


def _minimal_pdf(text: str) -> bytes:
    """
    PDF 1.4 valide, une page, sans dépendance : catalogue + pages + page +
    contenu texte. Les objets sont numérotés 1..6 (offsets du xref remplis à 0,
    acceptés par les lecteurs courants).
    """

    def esc(value: str) -> str:
        # Échappe les parenthèses et antislashs pour le littéral de chaîne PDF.
        return value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    lines = []
    y = 760
    for raw in (text or '').splitlines() or [text or '']:
        line = raw[:90]
        lines.append(f"BT /F1 11 Tf 50 {y} Td ({esc(line)}) Tj ET")
        y -= 16
    stream = "\n".join(lines)

    return (
        "%PDF-1.4\n"
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/"
        "Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj\n"
        f"4 0 obj<</Length {len(stream)}>>stream\n{stream}\nendstream endobj\n"
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        "6 0 obj<</Producer(demo_data)>>endobj\n"
        "trailer<</Root 1 0 R/Info 6 0 R>>\n"
        "%%EOF"
    ).encode('latin-1', errors='replace')


def _demo_context():
    """Composants de référence requis (créés par les seeds de base)."""
    campus = Campus.query.filter_by(code='PRINCIPAL').first()
    if campus is None:
        raise DemoDataError("Campus principal absent — lancez `flask seed all`.")

    doctypes = {t.name: t for t in DocType.query.all()}
    departments = {d.code: d for d in Department.query.all()}
    folders = {f.name: f for f in Folder.query.all()}
    for needed in ('Rapport', 'Administratif', 'Cours', 'Thèse', 'Mémoire'):
        if needed not in doctypes:
            raise DemoDataError(f"Type de document « {needed} » absent.")
    for needed in ('INFO', 'ADMIN'):
        if needed not in departments:
            raise DemoDataError(f"Département « {needed} » absent.")
    for needed in ('Documents Administratifs', 'Bibliothèque Numérique',
                   'Archives Académiques', 'Thèses et Mémoires'):
        if needed not in folders:
            raise DemoDataError(f"Dossier « {needed} » absent.")

    author = (UserAccount.query.filter_by(username='admin').first()
              or UserAccount.query.filter_by(role_id=1).first())
    return campus, doctypes, departments, folders, author


def _existing_titles() -> set:
    """Titres de documents déjà présents (idempotence du jeu de démo)."""
    rows = db.session.query(Document.title).filter(
        Document.title.in_([t for t, *_ in DEMO_DOCUMENTS])).all()
    return {row[0] for row in rows}


def _campus_code(campus_id: int) -> str:
    campus = db.session.get(Campus, campus_id)
    return (campus.code if campus and campus.code else f'campus{campus_id}').lower()


def _storage_key(campus_id: int, version_number: int) -> str:
    now = dt.datetime.utcnow()
    return (f"{_campus_code(campus_id)}/{now:%Y}/{now:%m}/"
            f"v{version_number}_{uuid.uuid4().hex[:8]}.pdf")


def _mime() -> str:
    return 'application/pdf'


def seed_tags() -> int:
    """Crée les étiquettes de démonstration (idempotent)."""
    present = {row[0] for row in db.session.query(Tag.name)
               .filter(Tag.name.in_(DEMO_TAG_NAMES)).all()}
    to_create = [Tag(name=name) for name in DEMO_TAG_NAMES if name not in present]
    if to_create:
        db.session.add_all(to_create)
        db.session.commit()
    return len(to_create)


def seed_demo_documents() -> int:
    """
    Crée les documents de démonstration avec un vrai fichier PDF chacun
    (via le service de stockage actif). Idempotent par clé de stockage.
    """
    campus, doctypes, departments, folders, author = _demo_context()
    seed_tags()
    storage = get_storage()
    existing_titles = _existing_titles()

    from app.services import audit_service

    created = 0
    for (title, description, type_name, dept_code, folder_name,
         confidentiality, tag_names, retention_days, content) in DEMO_DOCUMENTS:
        if title in existing_titles:
            continue  # déjà installé → idempotent
        content_bytes = _minimal_pdf(content)
        document = Document(
            title=title,
            description=description,
            status='active',
            confidentiality_level=confidentiality,
            retention_period=retention_days,
            retention_expires_at=dt.datetime.utcnow() + dt.timedelta(days=retention_days),
            size_bytes=len(content_bytes),
            is_encrypted=False,
            department_id=departments[dept_code].department_id,
            doc_type_id=doctypes[type_name].doc_type_id,
            folder_id=folders[folder_name].folder_id,
            campus_id=campus.campus_id,
        )
        db.session.add(document)
        db.session.flush()  # document_id pour la clé de stockage

        version_number = 1
        key = _storage_key(campus.campus_id, version_number)
        result = storage.save(key, io.BytesIO(content_bytes))

        version = DocumentVersion(
            document_id=document.document_id,
            version_number=version_number,
            storage_url=result['path'],
            mime_type=_mime(),
            checksum=result['checksum'],
            change_note="Version initiale (jeu de démonstration)",
            uploaded_by=author.user_id if author else None,
        )
        db.session.add(version)

        tags = Tag.query.filter(Tag.name.in_(tag_names)).all()
        for tag in tags:
            document.tags.append(tag)

        document.ocr_text = content

        db.session.commit()
        audit_service.log('demo_document_created', 'document',
                          object_id=document.document_id,
                          details={'demo': True},
                          user_id=author.user_id if author else None)
        created += 1
    return created


def seed_demo_content() -> dict:
    """Jeu de démonstration complet : étiquettes + documents (audit inclus)."""
    # Échec rapide : valider le contexte de référence avant toute écriture.
    _demo_context()
    return {
        'tags': seed_tags(),
        'documents': seed_demo_documents(),
    }
