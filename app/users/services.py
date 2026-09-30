from sqlalchemy import or_
from app.services import audit_service
from extensions import db
from app.models.user import UserAccount
from app.models.role import Role
from app.models.department import Department
import csv
import io

class UserService:
    
    @staticmethod
    def get_all_users(page=1, per_page=20, filters=None):
        """
        Récupère tous les utilisateurs avec pagination et filtres
        filters: {
            'search': str,
            'role_id': int,
            'department_id': int,
            'is_active': bool
        }
        """
        query = UserAccount.query
        
        # Appliquer les filtres
        if filters:
            # Recherche par nom, email, matricule, username
            if filters.get('search'):
                search = f"%{filters['search']}%"
                query = query.filter(
                    or_(
                        UserAccount.username.ilike(search),
                        UserAccount.email.ilike(search),
                        UserAccount.full_name.ilike(search),
                        UserAccount.matricule.ilike(search)
                    )
                )
            
            # Filtre par rôle
            if filters.get('role_id'):
                query = query.filter(UserAccount.role_id == filters['role_id'])
            
            # Filtre par département
            if filters.get('department_id'):
                query = query.filter(UserAccount.department_id == filters['department_id'])
            
            # Filtre par statut
            if filters.get('is_active') is not None:
                query = query.filter(UserAccount.is_active == filters['is_active'])
        
        # Pagination
        pagination = query.order_by(UserAccount.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return {
            'users': [user.to_dict() for user in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }
    
    @staticmethod
    def get_user_by_id(user_id):
        """Récupère un utilisateur par son ID"""
        user = UserAccount.query.get(user_id)
        if not user:
            return None, "Utilisateur non trouvé"
        return user.to_dict(include_sensitive=True), None
    
    @staticmethod
    def create_user(data, created_by_id):
        """Crée un nouveau utilisateur"""
        # Validation des champs requis (400 et non 500 si absents)
        required = ['matricule', 'username', 'role_id']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return None, f"Champs requis manquants: {', '.join(missing)}"
        
        # Vérifier si l'email existe déjà
        if data.get('email') and UserAccount.query.filter_by(email=data['email']).first():
            return None, "Cet email est déjà utilisé"
        
        # Vérifier si le username existe déjà
        if UserAccount.query.filter_by(username=data['username']).first():
            return None, "Ce nom d'utilisateur est déjà utilisé"
        
        # Vérifier si le matricule existe déjà
        if UserAccount.query.filter_by(matricule=data['matricule']).first():
            return None, "Ce matricule est déjà utilisé"
        
        # Vérifier que le rôle existe
        role = Role.query.get(data['role_id'])
        if not role:
            return None, "Rôle invalide"
        
        # Vérifier que le département existe (si fourni)
        if data.get('department_id'):
            department = Department.query.get(data['department_id'])
            if not department:
                return None, "Département invalide"
        
        try:
            # Créer l'utilisateur
            user = UserAccount(
                matricule=data['matricule'],
                username=data['username'],
                email=data.get('email'),
                full_name=data.get('full_name'),
                role_id=data['role_id'],
                department_id=data.get('department_id'),
                is_active=data.get('is_active', True)
            )
            
            # Définir le mot de passe (temporaire ou fourni)
            password = data.get('password', 'ChangeMe@123')
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Logger l'action
            audit_service.log(
                'user_created',
                'user_account',
                object_id=user.user_id,
                details={'username': user.username, 'email': user.email},
                user_id=created_by_id,
            )
            
            return user.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Erreur lors de la création: {str(e)}"
    
    @staticmethod
    def update_user(user_id, data, updated_by_id):
        """Met à jour un utilisateur"""
        user = UserAccount.query.get(user_id)
        if not user:
            return None, "Utilisateur non trouvé"
        
        try:
            # Vérifier l'unicité de l'email (si changé)
            if data.get('email') and data['email'] != user.email:
                if UserAccount.query.filter_by(email=data['email']).first():
                    return None, "Cet email est déjà utilisé"
                user.email = data['email']
            
            # Vérifier l'unicité du username (si changé)
            if data.get('username') and data['username'] != user.username:
                if UserAccount.query.filter_by(username=data['username']).first():
                    return None, "Ce nom d'utilisateur est déjà utilisé"
                user.username = data['username']
            
            # Mettre à jour les autres champs
            if 'full_name' in data:
                user.full_name = data['full_name']
            
            if 'role_id' in data:
                role = Role.query.get(data['role_id'])
                if not role:
                    return None, "Rôle invalide"
                user.role_id = data['role_id']
            
            if 'department_id' in data:
                if data['department_id']:
                    department = Department.query.get(data['department_id'])
                    if not department:
                        return None, "Département invalide"
                user.department_id = data['department_id']
            
            if 'is_active' in data:
                user.is_active = data['is_active']
            
            db.session.commit()
            
            # Logger l'action
            audit_service.log(
                'user_updated',
                'user_account',
                object_id=user.user_id,
                details={'changes': data},
                user_id=updated_by_id,
            )
            
            return user.to_dict(), None
        except Exception as e:
            db.session.rollback()
            return None, f"Erreur lors de la mise à jour: {str(e)}"
    
    @staticmethod
    def delete_user(user_id, deleted_by_id):
        """Supprime un utilisateur (soft delete)"""
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"
        
        # Ne pas supprimer son propre compte
        if user_id == deleted_by_id:
            return False, "Vous ne pouvez pas supprimer votre propre compte"
        
        try:
            # Soft delete: désactiver le compte
            user.is_active = False
            db.session.commit()
            
            # Logger l'action
            audit_service.log(
                'user_deleted',
                'user_account',
                object_id=user.user_id,
                details={'username': user.username},
                user_id=deleted_by_id,
            )
            
            return True, "Utilisateur supprimé avec succès"
        except Exception as e:
            db.session.rollback()
            return False, f"Erreur lors de la suppression: {str(e)}"
    
    @staticmethod
    def reset_password(user_id, new_password, reset_by_id):
        """Réinitialise le mot de passe d'un utilisateur"""
        user = UserAccount.query.get(user_id)
        if not user:
            return False, "Utilisateur non trouvé"
        
        try:
            user.set_password(new_password)
            db.session.commit()
            
            # Logger l'action
            audit_service.log(
                'password_reset_by_admin',
                'user_account',
                object_id=user.user_id,
                user_id=reset_by_id,
            )
            
            # Envoyer un email de notification
            from app.services.email_service import EmailService
            if user.email:
                EmailService.send_password_reset_notification(user.email, new_password)
            
            return True, "Mot de passe réinitialisé avec succès"
        except Exception as e:
            db.session.rollback()
            return False, f"Erreur lors de la réinitialisation: {str(e)}"
    
    @staticmethod
    def import_users_from_csv(file_content, created_by_id):
        """Importe des utilisateurs depuis un fichier CSV"""
        results = {
            'success': 0,
            'errors': [],
            'total': 0
        }
        
        try:
            # Lire le CSV
            csv_file = io.StringIO(file_content.decode('utf-8'))
            reader = csv.DictReader(csv_file)
            
            for row_num, row in enumerate(reader, start=2):
                results['total'] += 1
                
                try:
                    # Valider les champs requis
                    required_fields = ['matricule', 'username', 'email', 'full_name', 'role_id']
                    missing_fields = [f for f in required_fields if not row.get(f)]
                    
                    if missing_fields:
                        results['errors'].append({
                            'row': row_num,
                            'error': f"Champs manquants: {', '.join(missing_fields)}"
                        })
                        continue
                    
                    # Créer l'utilisateur
                    user_data = {
                        'matricule': row['matricule'],
                        'username': row['username'],
                        'email': row['email'],
                        'full_name': row['full_name'],
                        'role_id': int(row['role_id']),
                        'department_id': int(row['department_id']) if row.get('department_id') else None,
                        'is_active': row.get('is_active', 'true').lower() == 'true'
                    }
                    
                    user, error = UserService.create_user(user_data, created_by_id)
                    
                    if error:
                        results['errors'].append({
                            'row': row_num,
                            'error': error,
                            'data': row
                        })
                    else:
                        results['success'] += 1
                
                except Exception as e:
                    results['errors'].append({
                        'row': row_num,
                        'error': str(e),
                        'data': row
                    })
            
            return results, None
        except Exception as e:
            return None, f"Erreur lors de la lecture du CSV: {str(e)}"
    
    @staticmethod
    def export_users_to_csv(filters=None):
        """Exporte les utilisateurs en CSV"""
        query = UserAccount.query
        
        # Appliquer les filtres
        if filters:
            if filters.get('role_id'):
                query = query.filter(UserAccount.role_id == filters['role_id'])
            if filters.get('department_id'):
                query = query.filter(UserAccount.department_id == filters['department_id'])
            if filters.get('is_active') is not None:
                query = query.filter(UserAccount.is_active == filters['is_active'])
        
        users = query.all()
        
        # Créer le CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # En-têtes
        writer.writerow([
            'Matricule', 'Username', 'Email', 'Nom complet',
            'Rôle', 'Département', 'Statut', 'Date de création', 'Dernière connexion'
        ])
        
        # Données
        for user in users:
            writer.writerow([
                user.matricule,
                user.username,
                user.email or '',
                user.full_name or '',
                user.role.name if user.role else '',
                user.department.name if user.department else '',
                'Actif' if user.is_active else 'Inactif',
                user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else '',
                user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else ''
            ])
        
        return output.getvalue()
    
    @staticmethod
    def get_user_statistics():
        """Récupère les statistiques des utilisateurs"""
        total_users = UserAccount.query.count()
        active_users = UserAccount.query.filter_by(is_active=True).count()
        inactive_users = UserAccount.query.filter_by(is_active=False).count()
        
        # Utilisateurs par rôle
        users_by_role = db.session.query(
            Role.name,
            db.func.count(UserAccount.user_id)
        ).join(UserAccount).group_by(Role.name).all()
        
        # Utilisateurs par département
        users_by_department = db.session.query(
            Department.name,
            db.func.count(UserAccount.user_id)
        ).join(UserAccount).group_by(Department.name).all()
        
        return {
            'total': total_users,
            'active': active_users,
            'inactive': inactive_users,
            'by_role': [{'role': r[0], 'count': r[1]} for r in users_by_role],
            'by_department': [{'department': d[0], 'count': d[1]} for d in users_by_department]
        }