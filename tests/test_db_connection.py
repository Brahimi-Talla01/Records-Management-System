import sys
import os

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

print("Test de connexion à la base de données...")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL')[:50]}...")

try:
    from app import create_app
    
    app = create_app('development')
    
    with app.app_context():
        # Utiliser current_app pour accéder à db
        from flask import current_app
        db = current_app.extensions['sqlalchemy']
        
        # Tester la connexion
        with db.engine.connect() as connection:
            print("✓ Connexion à la base de données réussie!")
        
        # Vérifier les tables
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        print(f"\nTables existantes ({len(tables)}):")
        for table in tables:
            print(f"  - {table}")
        
        if len(tables) == 0:
            print("\n⚠ Aucune table trouvée. Exécutez 'flask db upgrade' pour créer les tables.")
        
except Exception as e:
    print(f"✗ Erreur: {e}")
    import traceback
    traceback.print_exc()