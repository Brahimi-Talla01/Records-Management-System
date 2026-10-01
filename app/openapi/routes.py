"""Documentation de l'API : spécification OpenAPI JSON et console (P6)."""

from __future__ import annotations

from html import escape

from flask import Blueprint, current_app, jsonify

from app.openapi.spec import build_spec

SWAGGER_UI = 'https://unpkg.com/swagger-ui-dist@5'

# Console de documentation : la page charge Swagger UI depuis unpkg, d'où un
# CSP propre à cette vue (la politique globale n'autorise que 'self').
_DOCS_CSP = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", SWAGGER_UI],
    'style-src': ["'self'", "'unsafe-inline'", SWAGGER_UI],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
}

_CSS = """
body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 70rem;
       padding: 0 1rem; color: #1f2937; }
code { background: #f3f4f6; padding: .1rem .3rem; border-radius: .25rem; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { border-bottom: 1px solid #e5e7eb; padding: .45rem .6rem;
         text-align: left; vertical-align: top; }
.method { font-weight: 700; }
.GET { color: #0369a1; } .POST { color: #15803d; } .PUT { color: #b45309; }
.PATCH { color: #a16207; } .DELETE { color: #b91c1c; }
.tag { color: #6b7280; white-space: nowrap; }
.path { white-space: nowrap; }
"""


def _rows(spec: dict) -> str:
    rows = []
    for path, operations in spec['paths'].items():
        for method, op in sorted(operations.items()):
            access = 'Session' if op.get('security') else 'Public'
            rows.append(
                '<tr><td class="tag">{tag}</td>'
                '<td class="method {method}">{method}</td>'
                '<td class="path"><code>{path}</code></td>'
                '<td>{summary}</td><td>{access}</td></tr>'.format(
                    tag=escape(op['tags'][0]),
                    method=method.upper(),
                    path=escape(path),
                    summary=escape(op['summary']),
                    access=access,
                ))
    return '\n'.join(rows)


def _docs_page(spec: dict) -> str:
    return """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>UniArchive — Documentation API</title>
<style>{css}</style>
</head>
<body>
<h1>UniArchive — API</h1>
<p>Spécification machine : <a href="/api/openapi.json">/api/openapi.json</a> —
contrat détaillé : <code>assets/08_api_reference.md</code>.</p>
<div id="swagger-ui"></div>
<table id="operations">
<thead><tr><th>Tag</th><th>Méthode</th><th>Route</th><th>Description</th>
<th>Accès</th></tr></thead>
<tbody>
{rows}
</tbody>
</table>
<script src="{swagger}/swagger-ui-bundle.js"></script>
<script>
if (window.SwaggerUIBundle) {{
  document.getElementById('operations').style.display = 'none';
  SwaggerUIBundle({{url: '/api/openapi.json', dom_id: '#swagger-ui'}});
}}
</script>
</body>
</html>
""".format(css=_CSS, rows=_rows(spec), swagger=SWAGGER_UI)


def register_openapi(app, talisman) -> None:
    blueprint = Blueprint('openapi', __name__)

    @blueprint.route('/api/openapi.json')
    def openapi_json():
        return jsonify(build_spec(current_app))

    @blueprint.route('/api/docs')
    @talisman(content_security_policy=_DOCS_CSP)
    def openapi_docs():
        return _docs_page(build_spec(current_app)), 200

    app.register_blueprint(blueprint)
