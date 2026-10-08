from app import create_app
from extensions import db

app = create_app('development')

with app.app_context():
    print("Test de connexion...")
    
    # Test simple
    result = db.session.execute(db.text("SELECT 1"))
    print("✓ Connexion réussie!")
    
    # Vérifier les tables
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print(f"Tables: {len(tables)}")
    for table in tables:
        print(f"  - {table}")