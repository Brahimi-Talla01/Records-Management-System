import os
from dotenv import load_dotenv 


from app import create_app
from extensions import db
from app.models.role import Role
from app.models.department import Department
from app.models.folder import Folder
from app.models.user import UserAccount
from app.models.doc_type import DocType

def init_database():
    """Initialise la base de données avec des données de base"""
    app = create_app('development')
    
    with app.app_context():
        print("Initialisation de la base de données...")
        
        # 1. Créer les rôles
        if Role.query.count() == 0:
            print("\n📋 Création des rôles...")
            roles = [
                Role(name='Admin', description='Administrateur système avec tous les droits'),
                Role(name='Prof', description='Professeur avec accès aux documents académiques'),
                Role(name='Etudiant', description='Étudiant avec accès limité'),
                Role(name='Secretaire', description='Secrétaire avec accès administratif')
            ]
            db.session.add_all(roles)
            db.session.commit()
            print(f"   ✓ {len(roles)} rôles créés")
        
        # 2. Créer les types de documents
        if DocType.query.count() == 0:
            print("\n📄 Création des types de documents...")
            doc_types = [
                DocType(name='Thèse', description='Thèse de doctorat', default_retention_days=3650),
                DocType(name='Mémoire', description='Mémoire de master', default_retention_days=1825),
                DocType(name='Rapport', description='Rapport de stage ou projet', default_retention_days=730),
                DocType(name='Article', description='Article scientifique', default_retention_days=1825),
                DocType(name='Cours', description='Support de cours', default_retention_days=1095),
                DocType(name='Administratif', description='Document administratif', default_retention_days=2555)
            ]
            db.session.add_all(doc_types)
            db.session.commit()
            print(f"   ✓ {len(doc_types)} types de documents créés")
        
        # 3. Créer les dossiers principaux
        if Folder.query.count() == 0:
            print("\n📁 Création des dossiers...")
            folders = [
                Folder(name='Archives Académiques'),
                Folder(name='Documents Administratifs'),
                Folder(name='Bibliothèque Numérique'),
                Folder(name='Thèses et Mémoires')
            ]
            db.session.add_all(folders)
            db.session.commit()
            print(f"   ✓ {len(folders)} dossiers créés")
        
        # 4. Créer les départements
        if Department.query.count() == 0:
            print("\n🏛️ Création des départements...")
            folder_admin = Folder.query.filter_by(name='Documents Administratifs').first()
            
            departments = [
                Department(
                    name='Informatique', 
                    code='INFO', 
                    description='Département d\'Informatique et Sciences du Numérique',
                    folder_id=folder_admin.folder_id if folder_admin else None
                ),
                Department(
                    name='Mathématiques', 
                    code='MATH', 
                    description='Département de Mathématiques et Statistiques'
                ),
                Department(
                    name='Physique', 
                    code='PHYS', 
                    description='Département de Physique'
                ),
                Department(
                    name='Administration', 
                    code='ADMIN', 
                    description='Administration générale de l\'université'
                )
            ]
            db.session.add_all(departments)
            db.session.commit()
            print(f"   ✓ {len(departments)} départements créés")
        
        # 5. Créer l'utilisateur admin par défaut
        if UserAccount.query.filter_by(username='admin').first() is None:
            print("\n👤 Création de l'utilisateur admin...")
            admin_role = Role.query.filter_by(name='Admin').first()
            admin_dept = Department.query.filter_by(code='ADMIN').first()
            
            admin_user = UserAccount(
                matricule='ADMIN001',
                username='admin',
                email='admin@uniarchive.edu',
                full_name='Administrateur Principal',
                role_id=admin_role.role_id,
                department_id=admin_dept.department_id,
                is_active=True
            )
            admin_user.set_password('Admin@2024')
            
            db.session.add(admin_user)
            db.session.commit()
            print("   ✓ Utilisateur admin créé")
            print("\n" + "="*60)
            print("   Identifiants de connexion:")
            print("   Username: admin")
            print("   Password: Admin@2024")
            print("   ⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION!")
            print("="*60)
        
        print("\n✅ Initialisation terminée avec succès!\n")

if __name__ == '__main__':
    init_database()