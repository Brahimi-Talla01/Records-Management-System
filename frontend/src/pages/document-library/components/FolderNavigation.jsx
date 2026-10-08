/**
 * Arborescence des dossiers (F3.1) : fil d'Ariane serveur + dossiers enfants
 * + création / édition / déplacement / suppression (rôles Admin·Secrétaire).
 * Sélectionner un dossier n'est qu'un `folder_id` dans l'URL.
 */
import { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/useToast';
import { useConfirm } from '../../../components/ui/useConfirm';
import { toAppError } from '../../../lib/errors';
import { flattenTree } from '../../../features/folders';

const FolderNavigation = ({
  tree = [],
  path = [],
  currentFolderId = null,
  canWrite = false,
  canManage = false,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null); // {mode: 'create'|'edit', folder}
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [busy, setBusy] = useState(false);

  const flat = flattenTree(tree);
  const children = currentFolderId
    ? flat.get(currentFolderId)?.subfolders || []
    : tree;

  useEffect(() => {
    if (!dialog) return;
    setName(dialog.mode === 'edit' ? dialog.folder.name : '');
    setParentId(
      dialog.mode === 'edit'
        ? String(dialog.folder.parent_folder_id ?? '')
        : String(currentFolderId ?? '')
    );
  }, [dialog, currentFolderId]);

  const submit = async (event) => {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;
    setBusy(true);
    try {
      if (dialog.mode === 'create') {
        await onCreate({ name: label, parent_folder_id: Number(parentId) || null });
        toast.success('Dossier créé.');
      } else {
        await onRename(dialog.folder.folder_id, {
          name: label,
          parent_folder_id: Number(parentId) || null,
        });
        toast.success('Dossier mis à jour.');
      }
      setDialog(null);
    } catch (error) {
      // 409 folder_cycle / folder_not_empty traduits par lib/errors
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (folder) => {
    const ok = await confirm({
      title: `Supprimer « ${folder.name} »`,
      description: 'Seuls les dossiers vides peuvent être supprimés.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await onDelete(folder.folder_id);
      toast.success('Dossier supprimé.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  // Les descendants du dossier à déplacer sont exclus (anti-cycle côté UI).
  const moveTargets = () => {
    const banned = new Set([dialog.folder.folder_id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, node] of flat) {
        if (node.parent_id !== null && banned.has(node.parent_id) && !banned.has(id)) {
          banned.add(id);
          changed = true;
        }
      }
    }
    return [...flat.values()].filter((node) => !banned.has(node.folder_id));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      {/* Fil d'Ariane : chemin rendu par le serveur (GET /folders/<id>/path) */}
      <nav
        className="flex flex-wrap items-center gap-1 mb-4"
        aria-label="Chemin du dossier"
      >
        <Button
          variant="ghost"
          size="sm"
          iconName="Home"
          iconPosition="left"
          onClick={() => onSelect(null)}
          className={
            currentFolderId === null
              ? 'font-body font-medium text-foreground'
              : 'font-body text-muted-foreground hover:text-foreground'
          }
        >
          Racine
        </Button>
        {path.map((folder) => (
          <div key={folder.folder_id} className="flex items-center gap-1">
            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(folder.folder_id)}
              className={
                folder.folder_id === currentFolderId
                  ? 'font-body font-medium text-foreground'
                  : 'font-body text-muted-foreground hover:text-foreground'
              }
            >
              {folder.name}
            </Button>
          </div>
        ))}
      </nav>

      {/* Dossiers du niveau courant */}
      {children.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {children.map((folder) => (
            <div key={folder.folder_id} className="relative group">
              <button
                type="button"
                onClick={() => onSelect(folder.folder_id)}
                className="w-full flex flex-col items-center p-3 rounded-lg hover:bg-muted transition-colors duration-200"
              >
                <Icon
                  name={folder.subfolders?.length ? 'FolderOpen' : 'Folder'}
                  size={32}
                  className="text-accent group-hover:text-primary transition-colors duration-200"
                />
                <span className="font-body text-xs text-center text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                  {folder.name}
                </span>
              </button>

              {(canWrite || canManage) && (
                <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Renommer / déplacer"
                      onClick={() => setDialog({ mode: 'edit', folder })}
                    >
                      <Icon name="Edit" size={12} />
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Supprimer"
                      onClick={() => handleDelete(folder)}
                    >
                      <Icon name="Trash2" size={12} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {children.length === 0 && (
        <div className="text-center py-8">
          <Icon name="FolderOpen" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading font-medium text-lg text-foreground mb-2">
            Aucun sous-dossier
          </h3>
          <p className="font-body text-muted-foreground">
            Ce dossier est vide : créez un sous-dossier pour structurer les archives.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <span className="font-caption text-xs text-muted-foreground">
          {flat.size} dossier{flat.size > 1 ? 's' : ''} au total
        </span>
        <div className="flex items-center space-x-2">
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              iconName="FolderPlus"
              iconPosition="left"
              onClick={() => setDialog({ mode: 'create' })}
              className="font-body"
            >
              Nouveau dossier
            </Button>
          )}
          {dialog?.mode === 'create' && canManage && (
            <Button
              variant="ghost"
              size="sm"
              iconName="Trash2"
              iconPosition="left"
              onClick={() =>
                currentFolderId && handleDelete(flat.get(currentFolderId))
              }
              disabled={!currentFolderId}
              className="font-body text-muted-foreground"
            >
              Supprimer le dossier courant
            </Button>
          )}
        </div>
      </div>

      {/* Dialogue création / édition (nom + parent) */}
      {dialog && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-foreground/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={dialog.mode === 'create' ? 'Nouveau dossier' : 'Modifier le dossier'}
          onClick={() => setDialog(null)}
        >
          <form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-modal"
          >
            <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
              {dialog.mode === 'create' ? 'Nouveau dossier' : 'Modifier le dossier'}
            </h2>

            <Input
              label="Nom du dossier"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />

            <label className="block text-sm font-medium text-foreground mt-4 mb-2">
              Dossier parent
            </label>
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Racine</option>
              {(dialog.mode === 'edit' ? moveTargets() : [...flat.values()]).map(
                (node) => (
                  <option key={node.folder_id} value={node.folder_id}>
                    {node.name}
                  </option>
                )
              )}
            </select>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={busy}>
                {dialog.mode === 'create' ? 'Créer' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FolderNavigation;
