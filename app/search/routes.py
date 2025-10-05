from flask import Blueprint

search_bp = Blueprint("search", __name__)

@search_bp.route("/")
def index():
    return {"message": "Search module OK"}
