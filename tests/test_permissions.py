import itertools

import pytest

from app.models.audit import AuditLog
from app.models.campus import Campus
from app.models.department import Department
from app.models.doc_type import DocType
from app.models.document import Document
from app.models.folder import Folder
from app.models.role import Role
from app.models.user import UserAccount
from app.services.permission_service import PermissionService
from extensions import db

_counter = itertools.count(1)


def make_user(role_name, campus_id=None, department_id=None):
    role = Role.query.filter_by(name=role_name).first()
    assert role is not None
    n = next(_counter)
    user = UserAccount(
        matricule=f'U{n:04d}', username=f'user{n}', email=f'user{n}@uniarchive.edu',
        role_id=role.role_id, campus_id=campus_id, department_id=department_id,
        is_active=True,
    )
    user.set_password('User@2026')
    db.session.add(user)
    db.session.commit()
    return user


def make_document(campus_id, doc_type_id, title='Doc', confidentiality='internal',
                  department_id=None, folder_id=None):
    document = Document(title=title, campus_id=campus_id, doc_type_id=doc_type_id,
                        department_id=department_id, folder_id=folder_id,
                        confidentiality_level=confidentiality)
    db.session.add(document)
    db.session.commit()
    return document


def principal_id():
    campus = Campus.query.filter_by(code='PRINCIPAL').first()
    assert campus is not None
    return campus.campus_id


@pytest.fixture
def base(app):
    with app.app_context():
        principal = Campus.query.filter_by(code='PRINCIPAL').first()
        second = Campus(code='SUD', name='Campus Sud')
        db.session.add(second)
        db.session.commit()
        info = Department.query.filter_by(code='INFO').first()
        maths = Department.query.filter_by(code='MATH').first()
        doc_type = DocType.query.filter_by(name='Rapport').first()
        assert principal and info and maths and doc_type
        doc_type_id = doc_type.doc_type_id
        return {
            'principal': principal.campus_id,
            'second': second.campus_id,
            'info': info.department_id,
            'maths': maths.department_id,
            'doc_type_id': doc_type_id,
        }


def explain(user, document, action='view'):
    return PermissionService.explain(user, document, action)


def test_super_admin_autorise(base):
    admin = make_user('Admin', campus_id=None)
    document = make_document(base['principal'], base['doc_type_id'],
                             confidentiality='secret')

    assert explain(admin, document) == {'allowed': True, 'rule': 'admin'}


def test_admin_de_campus_autorise_sur_son_campus(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['principal'], base['doc_type_id'])

    assert explain(admin, document)['allowed'] is True


def test_admin_de_campus_refuse_autre_campus(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['second'], base['doc_type_id'])

    assert explain(admin, document) == {'allowed': False, 'rule': 'campus'}


def test_utilisateur_autre_campus_refuse(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['second'], base['doc_type_id'], 'public')

    assert explain(student, document) == {'allowed': False, 'rule': 'campus'}


@pytest.mark.parametrize(
    'level,allowed',
    [('public', True), ('internal', True), ('secret', False)],
)
def test_confidentialite_simple(base, level, allowed):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'], confidentiality=level)

    assert explain(student, document)['allowed'] is allowed


def test_confidentialite_confidentiel_meme_departement(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'],
                             confidentiality='confidential', department_id=base['info'])

    assert explain(student, document)['allowed'] is True


def test_confidentialite_confidentiel_autre_departement(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['maths'])
    document = make_document(base['principal'], base['doc_type_id'],
                             confidentiality='confidential', department_id=base['info'])

    assert explain(student, document)['allowed'] is False


def test_edition_refusee_sans_droit(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'])

    assert explain(student, document, 'edit') == {'allowed': False, 'rule': 'no_grant'}


def test_effet_dune_autorisation_explicite(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'],
                             confidentiality='secret')
    PermissionService.grant_document_user(student.user_id, document.document_id,
                                          {'view': True}, granted_by=student.user_id)

    assert explain(student, document) == {'allowed': True, 'rule': 'explicit_user'}


def test_deni_explicite_prime_sur_confidentialite(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'], 'public')
    PermissionService.grant_document_user(student.user_id, document.document_id,
                                          {'view': False}, granted_by=student.user_id)

    assert explain(student, document) == {'allowed': False, 'rule': 'explicit_user'}


def test_deni_explicite_prime_sur_admin(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['principal'], base['doc_type_id'])
    PermissionService.grant_document_user(admin.user_id, document.document_id,
                                          {'view': False}, granted_by=admin.user_id)

    assert explain(admin, document) == {'allowed': False, 'rule': 'explicit_user'}


def test_droit_de_role_sur_document(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    role_id = student.role_id
    document = make_document(base['principal'], base['doc_type_id'])
    PermissionService.grant_document_role(role_id, document.document_id,
                                          {'view': True, 'download': True},
                                          granted_by=student.user_id)

    assert explain(student, document)['rule'] == 'explicit_role'
    assert explain(student, document, 'download')['allowed'] is True


def test_heritage_du_dossier_utilisateur(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    parent = Folder(name='Parent', campus_id=base['principal'])
    db.session.add(parent)
    db.session.commit()
    child = Folder(name='Enfant', campus_id=base['principal'],
                   parent_folder_id=parent.folder_id)
    db.session.add(child)
    db.session.commit()
    document = make_document(base['principal'], base['doc_type_id'],
                             folder_id=child.folder_id)
    PermissionService.grant_folder_user(student.user_id, parent.folder_id,
                                        {'view': True}, granted_by=student.user_id)

    assert explain(student, document) == {'allowed': True, 'rule': 'folder_user'}


def test_heritage_du_dossier_role(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    folder = Folder(name='Rôle', campus_id=base['principal'])
    db.session.add(folder)
    db.session.commit()
    document = make_document(base['principal'], base['doc_type_id'],
                             folder_id=folder.folder_id)
    PermissionService.grant_folder_role(student.role_id, folder.folder_id,
                                        {'view': True}, granted_by=student.user_id)

    assert explain(student, document) == {'allowed': True, 'rule': 'folder_role'}


def test_deni_de_dossier_prime_sur_admin(base):
    admin = make_user('Admin', campus_id=base['principal'])
    folder = Folder(name='Restreint', campus_id=base['principal'])
    db.session.add(folder)
    db.session.commit()
    document = make_document(base['principal'], base['doc_type_id'],
                             folder_id=folder.folder_id)
    PermissionService.grant_folder_user(admin.user_id, folder.folder_id,
                                        {'view': False}, granted_by=admin.user_id)

    assert explain(admin, document) == {'allowed': False, 'rule': 'folder_user'}


def test_autorisation_document_prime_sur_dossier(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    folder = Folder(name='F', campus_id=base['principal'])
    db.session.add(folder)
    db.session.commit()
    document = make_document(base['principal'], base['doc_type_id'],
                             folder_id=folder.folder_id)
    PermissionService.grant_folder_user(student.user_id, folder.folder_id,
                                        {'view': False}, granted_by=student.user_id)
    PermissionService.grant_document_user(student.user_id, document.document_id,
                                          {'view': True}, granted_by=student.user_id)

    assert explain(student, document) == {'allowed': True, 'rule': 'explicit_user'}


def test_admin_peut_editer(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['principal'], base['doc_type_id'])

    assert explain(admin, document, 'edit')['allowed'] is True
    assert explain(admin, document, 'delete')['allowed'] is True


def test_utilisateur_ne_peut_pas_supprimer(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'])

    assert explain(student, document, 'delete')['allowed'] is False


def test_effective_renvoie_les_quatre_actions(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['principal'], base['doc_type_id'])

    effective = PermissionService.effective(admin, document)
    assert set(effective) == {'view', 'download', 'edit', 'delete'}
    assert all(v['allowed'] for v in effective.values())


def test_action_inconnue(base):
    admin = make_user('Admin', campus_id=base['principal'])
    document = make_document(base['principal'], base['doc_type_id'])

    assert explain(admin, document, 'share') == {'allowed': False,
                                                 'rule': 'unknown_action'}


def test_explain_folder_admin(base):
    admin = make_user('Admin', campus_id=base['principal'])
    folder = Folder(name='F', campus_id=base['principal'])
    db.session.add(folder)
    db.session.commit()

    assert PermissionService.explain_folder(admin, folder) == {'allowed': True,
                                                               'rule': 'admin'}


def test_explain_folder_autre_campus(base):
    admin = make_user('Admin', campus_id=base['principal'])
    folder = Folder(name='F', campus_id=base['second'])
    db.session.add(folder)
    db.session.commit()

    assert PermissionService.explain_folder(admin, folder) == {'allowed': False,
                                                               'rule': 'campus'}


def test_revocation_supprime_le_droit(base):
    student = make_user('Etudiant', campus_id=base['principal'], department_id=base['info'])
    document = make_document(base['principal'], base['doc_type_id'],
                             confidentiality='secret')
    PermissionService.grant_document_user(student.user_id, document.document_id,
                                          {'view': True}, granted_by=student.user_id)
    assert explain(student, document)['allowed'] is True

    from app.models.user_document_right import UserDocumentRight
    assert PermissionService.revoke(UserDocumentRight, user_id=student.user_id,
                                    document_id=document.document_id) is True
    assert explain(student, document)['allowed'] is False


def test_api_effective_document(admin, base):
    document = make_document(principal_id(), base['doc_type_id'])

    resp = admin.get(f"/api/permissions/document/{document.document_id}")

    assert resp.status_code == 200
    assert resp.get_json()['effective']['view']['allowed'] is True


def test_api_grants_liste_et_octroi(admin, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'])
    target = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])

    granted = admin.put(f"/api/permissions/document/{document.document_id}/user/{target.user_id}",
                        json={'view': True, 'download': True})
    assert granted.status_code == 200

    grants = admin.get(f"/api/permissions/document/{document.document_id}/grants")
    assert grants.status_code == 200
    assert grants.get_json()['users'][0]['user_id'] == target.user_id
    assert PermissionService.can_view_document(target, document) is True


def test_api_revocation_droit(admin, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'])
    target = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])
    admin.put(f"/api/permissions/document/{document.document_id}/user/{target.user_id}",
              json={'view': True})

    resp = admin.delete(f"/api/permissions/document/{document.document_id}/user/{target.user_id}")
    assert resp.status_code == 200
    assert admin.delete(f"/api/permissions/document/{document.document_id}/user/{target.user_id}").status_code == 404


def test_api_octroi_refuse_sans_droit(student, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'])
    target = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])

    resp = student.put(f"/api/permissions/document/{document.document_id}/user/{target.user_id}",
                       json={'view': True})
    assert resp.status_code == 403


def test_acces_apres_octroi_dossier(do_login, base):
    campus_id = principal_id()
    folder = Folder(name='Personnel', campus_id=campus_id)
    db.session.add(folder)
    db.session.commit()
    document = make_document(campus_id, base['doc_type_id'], confidentiality='secret',
                             folder_id=folder.folder_id)
    user = make_user('Prof', campus_id=campus_id, department_id=base['info'])
    PermissionService.grant_folder_user(user.user_id, folder.folder_id,
                                        {'view': True}, granted_by=user.user_id)

    session = do_login(user.username, 'User@2026')
    resp = session.get(f"/api/documents/{document.document_id}")
    assert resp.status_code == 200


def test_acces_refuse_journalise(do_login, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'], confidentiality='secret')
    user = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])

    session = do_login(user.username, 'User@2026')
    resp = session.get(f"/api/documents/{document.document_id}")

    assert resp.status_code == 403
    assert resp.get_json()['code'] == 'document_forbidden'
    assert AuditLog.query.filter_by(action='permission_denied').count() >= 1


def test_api_check(admin, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'], confidentiality='secret')
    target = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])

    allowed = admin.post('/api/permissions/check', json={
        'object': 'document', 'id': document.document_id, 'action': 'view',
        'user_id': target.user_id,
    })
    assert allowed.get_json() == {'allowed': False, 'reason': 'confidentiality'}

    granted = admin.post('/api/permissions/check', json={
        'object': 'document', 'id': document.document_id, 'action': 'view',
        'user_id': admin.user_id,
    })
    assert granted.get_json()['allowed'] is True


def test_api_check_dossier(admin, base):
    campus_id = principal_id()
    folder = Folder(name='F', campus_id=campus_id)
    db.session.add(folder)
    db.session.commit()

    resp = admin.post('/api/permissions/check', json={
        'object': 'folder', 'id': folder.folder_id, 'action': 'view'})
    assert resp.get_json() == {'allowed': True, 'reason': 'admin'}


def test_api_folder_grant_reserve_admin(student, base):
    campus_id = principal_id()
    folder = Folder(name='F', campus_id=campus_id)
    db.session.add(folder)
    db.session.commit()
    target = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])

    resp = student.put(f"/api/permissions/folder/{folder.folder_id}/user/{target.user_id}",
                       json={'view': True})
    assert resp.status_code == 403


def test_api_grant_role_document(admin, base):
    campus_id = principal_id()
    document = make_document(campus_id, base['doc_type_id'])
    role = Role.query.filter_by(name='Etudiant').first()
    assert role is not None
    role_id = role.role_id

    resp = admin.put(f"/api/permissions/document/{document.document_id}/role/{role_id}",
                     json={'view': True})
    assert resp.status_code == 200

    student = make_user('Etudiant', campus_id=campus_id, department_id=base['info'])
    assert PermissionService.can_view_document(student, document) is True
