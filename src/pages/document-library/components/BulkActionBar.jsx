/**
 * Actions groupées (F3.5) : `POST /documents/bulk` avec `move / delete /
 * restore / confidentiality`, chaque action destructive passant par
 * `ConfirmDialog` (A5). Les dossiers viennent de l'arbre API.
 */
import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { flattenTree } from '../../../features/folders';

const ACTIONS = {
  delete: { label: 'Mettre à la corbeille', icon: 'Trash2', danger: true },
  restore: { label: 'Restaurer', icon: 'RotateCcw' },
  move: { label: 'Déplacer', icon: 'FolderOpen' },
  confidentiality: { label: 'Confidentialité', icon: 'Shield' },
};

const CONFIDENTIALITIES = ['public', 'internal', 'confidential', 'secret'];

const BulkActionBar = ({
  selected = [],
  isDeletedView = false,
  folders = [],
  onClear,
  onApply,
  busy = false,
}) => {
  const [action, setAction] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [level, setLevel] = useState('internal');

  if (selected.length === 0) return null;

  const choices = isDeletedView
    ? ['restore', 'delete']
    : ['move', 'confidentiality', 'delete'];

  const handleApply = () => {
    if (!action) return;
    const payload = { ids: selected, action };
    if (action === 'move') payload.folder_id = Number(targetFolder) || null;
    if (action === 'confidentiality') payload.confidentiality = level;
    onApply(payload);
    setAction('');
  };

  const folderOptions = [{ folder_id: 0, name: 'Racine' }, ...flattenTree(folders).values()];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-card border border-border rounded-lg shadow-modal p-4 min-w-96">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-medium text-sm">
                {selected.length}
              </span>
            </div>
            <p className="font-body font-medium text-sm text-foreground">
              {selected.length} document{selected.length > 1 ? 's' : ''} sélectionné
              {selected.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              aria-label="Action groupée"
              className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une action…</option>
              {choices.map((key) => (
                <option key={key} value={key}>
                  {ACTIONS[key].label}
                </option>
              ))}
            </select>

            {action === 'move' && (
              <select
                value={targetFolder}
                onChange={(event) => setTargetFolder(event.target.value)}
                aria-label="Dossier de destination"
                className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {folderOptions.map((folder) => (
                  <option key={folder.folder_id} value={folder.folder_id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            )}

            {action === 'confidentiality' && (
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                aria-label="Niveau de confidentialité"
                className="h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CONFIDENTIALITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant={action === 'delete' ? 'danger' : 'default'}
              size="sm"
              iconName={action ? ACTIONS[action].icon : 'Play'}
              iconPosition="left"
              onClick={handleApply}
              disabled={!action || busy}
              loading={busy}
            >
              Appliquer
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              title="Annuler la sélection"
              className="text-muted-foreground"
            >
              <Icon name="X" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionBar;
