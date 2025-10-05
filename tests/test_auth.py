#test_auth.py
import requests
import json

BASE_URL = 'http://localhost:5000/api'

def test_login():
    """Test de connexion"""
    print("\n=== Test de Connexion ===")
    
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'username': 'admin',
        'password': 'Admin@2024'
    })
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        return data.get('access_token')
    return None

def test_get_current_user(token):
    """Test récupération utilisateur actuel"""
    print("\n=== Test Get Current User ===")
    
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f'{BASE_URL}/auth/me', headers=headers)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == '__main__':
    print("Démarrage des tests d'authentification...\n")
    
    # Test de connexion
    token = test_login()
    
    if token:
        # Test avec authentification
        test_get_current_user(token)
        print("\n✅ Tests terminés avec succès!")
    else:
        print("\n❌ Échec de la connexion")