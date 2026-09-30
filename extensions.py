from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
cors = CORS()
mail = Mail()

# Rate limiting global.
# `storage_uri` n'est PAS passé ici : Flask-Limiter priorise cette valeur sur
# app.config['RATELIMIT_STORAGE_URI'] (voir init_app : `self._storage_uri or config`).
# En dur "memory://" ici, Redis était donc systématiquement ignoré → limites
# par process, réinitialisées à chaque redémarrage.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri=None,
)
