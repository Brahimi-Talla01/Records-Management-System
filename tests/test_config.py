from dotenv import load_dotenv
import os

load_dotenv()

print("Configuration chargée:")
print(f"FLASK_ENV: {os.getenv('FLASK_ENV')}")
print(f"DATABASE_URL: {(os.getenv('DATABASE_URL') or '')[:50]}...")
print(f"MAIL_SERVER: {os.getenv('MAIL_SERVER')}")
print(f"MAIL_USERNAME: {os.getenv('MAIL_USERNAME')}")
print(f"SECRET_KEY défini: {'Oui' if os.getenv('SECRET_KEY') else 'Non'}")
print(f"JWT_SECRET_KEY défini: {'Oui' if os.getenv('JWT_SECRET_KEY') else 'Non'}")