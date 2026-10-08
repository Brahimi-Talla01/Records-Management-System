from extensions import db

# Table d'association pour la relation many-to-many entre Document et Tag
document_tag = db.Table('document_tag',
    db.Column('document_id', db.Integer, db.ForeignKey('document.document_id', ondelete='CASCADE'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.tag_id', ondelete='CASCADE'), primary_key=True, index=True)
)