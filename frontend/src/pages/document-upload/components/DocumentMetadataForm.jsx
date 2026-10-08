/**
 * Métadonnées communes à la file de dépôt (F4.4).
 *
 * Types, départements et dossiers viennent de l'API (référentiels) ; le niveau
 * de confidentialité `confidential|secret` déclenche le chiffrement au repos
 * côté serveur, signalé explicitement à l'utilisateur.
 */
import { useState } from 'react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { getConfidentialityMeta } from '../../../lib/formatters';
import { flattenTree } from '../../../features/folders';

const CONFIDENTIALITY_ORDER = ['public', 'internal', 'confidential', 'secret'];

const RETENTION_OPTIONS = [
  { value: '', label: 'Par défaut du type' },
  { value: '365', label: '1 an' },
  { value: '1095', label: '3 ans' },
  { value: '1825', label: '5 ans' },
  { value: '3650', label: '10 ans' },
];

/** Arbre de dossiers → options indentées (racine = « Aucun dossier »). */
function folderOptions(tree = []) {
  const flat = flattenTree(tree);
  return [...flat.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .map((node) => ({ value: String(node.folder_id), label: `${'— '.repeat(node.depth)}${node.name}` }));
}

const DocumentMetadataForm = ({
  onSubmit,
  isSubmitting,
  selectedCount = 0,
  docTypes = [],
  departments = [],
  folders = [],
  ocrEnabled = false,
  onCancel,
}) => {
  const [form, setForm] = useState({
    description: '',
    doc_type_id: '',
    department_id: '',
    folder_id: '',
    confidentiality_level: 'internal',
    retention_period: '',
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const encrypting = ['confidential', 'secret'].includes(form.confidentiality_level);

  const docTypeOptions = docTypes.map((type) => ({
    value: String(type.doc_type_id),
    label: type.name,
  }));
  const departmentOptions = departments.map((department) => ({
    value: String(department.department_id),
    label: department.name,
  }));
  const confidentialityOptions = CONFIDENTIALITY_ORDER.map((level) => ({
    value: level,
    label: getConfidentialityMeta(level).label,
  }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.doc_type_id) {
      setErrors({ doc_type_id: 'Le type de document est requis.' });
      return;
    }
    onSubmit({
      description: form.description.trim() || undefined,
      doc_type_id: Number(form.doc_type_id),
      department_id: form.department_id ? Number(form.department_id) : undefined,
      folder_id: form.folder_id ? Number(form.folder_id) : undefined,
      confidentiality_level: form.confidentiality_level || undefined,
      retention_period: form.retention_period ? Number(form.retention_period) : undefined,
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-card">
      <div className="flex items-center space-x-3 mb-6">
        <Icon name="FileText" size={24} className="text-primary" />
        <div>
          <h3 className="text-lg font-heading font-semibold text-foreground">
            Métadonnées du dépôt
          </h3>
          <p className="text-sm text-muted-foreground font-body">
            {selectedCount > 0
              ? `Appliquées aux ${selectedCount} fichier${selectedCount > 1 ? 's' : ''} en attente`
              : 'Aucun fichier en attente'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Select
            label="Type de document"
            options={docTypeOptions}
            value={form.doc_type_id}
            onChange={(value) => update('doc_type_id', value)}
            placeholder="Sélectionnez un type"
            error={errors.doc_type_id}
            required
          />
          <Select
            label="Département"
            options={departmentOptions}
            value={form.department_id}
            onChange={(value) => update('department_id', value)}
            placeholder="Aucun département"
            searchable
          />
          <Select
            label="Dossier de destination"
            options={folderOptions(folders)}
            value={form.folder_id}
            onChange={(value) => update('folder_id', value)}
            placeholder="Racine du campus"
            searchable
            clearable
          />
          <Select
            label="Période de rétention"
            options={RETENTION_OPTIONS}
            value={form.retention_period}
            onChange={(value) => update('retention_period', value)}
          />
          <Select
            label="Niveau de confidentialité"
            options={confidentialityOptions}
            value={form.confidentiality_level}
            onChange={(value) => update('confidentiality_level', value)}
          />
        </div>

        {encrypting && (
          <div
            role="status"
            className="flex items-start space-x-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm font-body text-foreground"
          >
            <Icon name="ShieldCheck" size={16} className="mt-0.5 text-warning" />
            <span>
              Les niveaux « Confidentiel » et « Secret » sont <strong>chiffrés au repos</strong> par
              le serveur (AES-GCM) : le document sera déchiffré de façon transparente au téléchargement.
            </span>
          </div>
        )}

        {ocrEnabled && (
          <p className="flex items-center space-x-2 text-sm text-muted-foreground font-body">
            <Icon name="ScanText" size={16} />
            <span>L'OCR est activé : le texte sera extrait automatiquement après le dépôt.</span>
          </p>
        )}

        <div>
          <label className="block text-sm font-body font-medium text-foreground mb-2">
            Description (optionnelle)
          </label>
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Décrivez le contenu des documents…"
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body resize-none"
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            iconName="Upload"
            iconPosition="left"
            iconSize={16}
            disabled={selectedCount === 0}
          >
            Démarrer le dépôt
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DocumentMetadataForm;
