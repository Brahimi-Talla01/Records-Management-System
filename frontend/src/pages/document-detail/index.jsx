/**
 * Fiche document (F3.3–F3.5) : métadonnées, droits effectifs, versions,
 * étiquettes, téléchargement et aperçu.
 *
 * Les boutons d'action ne sont pas décoratifs : ils sont activés par
 * `GET /permissions/document/<id>` (view/download/edit/delete), qui reflète
 * les règles serveur (dossier, rôle, confidentialité, campus).
 */
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import DocumentPreviewModal from '../document-library/components/DocumentPreviewModal';
import { useAuth } from '../../features/auth';
import {
  useDocument,
  useDocumentPermissions,
  useDocumentVersions,
  useRestoreVersion,
  useDeleteDocument,
  useRestoreDocument,
  useAddDocumentVersion,
  useAddDocumentTags,
  useRemoveDocumentTags,
  documentsApi,
} from '../../features/documents';
import { usePublicSettings } from '../../features/settings';
import { toAppError } from '../../lib/errors';
import { validateFile } from '../../lib/upload';
import {
  mapBackendRole,
  formatDateTime,
  formatFileSize,
  getDocumentStatusMeta,
  getConfidentialityMeta,
} from '../../lib/formatters';

/** Libellé français de la règle de droit expliquée par le backend. */
const RULE_LABELS = {
  admin: 'Administrateur',
  confidentiality: 'Niveau de confidentialité',
  explicit_user: 'Droit accordé à cet utilisateur',
  explicit_role: 'Droit accordé à votre rôle',
  folder_user: 'Hérité du dossier (utilisateur)',
  folder_role: 'Hérité du dossier (rôle)',
  no_grant: 'Aucun droit accordé',
  campus: 'Périmètre du campus',
  unknown_action: 'Action inconnue',
};

const RIGHT_LABELS = {
  view: { label: 'Consulter', icon: 'Eye' },
  download: { label: 'Télécharger', icon: 'Download' },
  edit: { label: 'Modifier', icon: 'Edit' },
  delete: { label: 'Supprimer', icon: 'Trash2' },
};

const DocumentDetail = () => {
  const { documentId } = useParams();
  const id = Number(documentId);
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  const [newTag, setNewTag] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const versionInputRef = useRef(null);
  const { upload } = usePublicSettings();

  const detailQuery = useDocument(id);
  const permissionsQuery = useDocumentPermissions(id);
  const versionsQuery = useDocumentVersions(id);

  const addVersion = useAddDocumentVersion();
  const restoreVersion = useRestoreVersion();
  const deleteDocument = useDeleteDocument();
  const restoreDocument = useRestoreDocument();
  const addTags = useAddDocumentTags();
  const removeTags = useRemoveDocumentTags();

  const doc = detailQuery.data;
  const rights = permissionsQuery.data?.effective || {};
  const versions = versionsQuery.data || [];

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte
    } finally {
      navigate('/login');
    }
  };

  const status = getDocumentStatusMeta(doc?.status);
  const confidentiality = getConfidentialityMeta(doc?.confidentiality_level);

  const rule = rights.download?.rule || rights.view?.rule;
  const ruleSummary = RULE_LABELS[rule] || 'Règle du dossier ou du rôle';

  const handleDownload = async () => {
    const latest = versions[0];
    if (!latest) {
      toast.warning('Aucune version à télécharger.');
      return;
    }
    setBusy(true);
    try {
      const name = await documentsApi.downloadVersion(
        id,
        latest.version_id,
        `${doc.title}.bin`
      );
      toast.success(`Téléchargement « ${name} » lancé.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Ajoute une version à partir d'un fichier local (F4.1). */
  const handleAddVersion = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const check = validateFile(file, {
      allowedExtensions: upload.allowedExtensions,
      maxSizeMb: upload.maxUploadMb,
    });
    if (!check.ok) {
      toast.error(check.message);
      return;
    }

    const ok = await confirm({
      title: 'Déposer une nouvelle version',
      description: `« ${file.name} » deviendra la version la plus récente de « ${doc.title} » ; les versions précédentes restent consultables.`,
      confirmLabel: 'Déposer',
      variant: 'default',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await addVersion.mutateAsync({ documentId: id, file });
      toast.success('Nouvelle version déposée.');
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreVersion = async (version) => {
    const ok = await confirm({
      title: `Revenir à la version ${version.version_number}`,
      description:
        'Une nouvelle version sera créée à partir de ce contenu : les versions intermédiaires restent consultables.',
      confirmLabel: 'Restaurer',
      variant: 'default',
    });
    if (!ok) return;
    try {
      await restoreVersion.mutateAsync({ documentId: id, versionId: version.version_id });
      toast.success(`Version ${version.version_number} restaurée.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Mettre à la corbeille',
      description: `« ${doc.title} » sera déplacé vers la corbeille (restaurable).`,
      confirmLabel: 'Mettre à la corbeille',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteDocument.mutateAsync(id);
      toast.success('Document déplacé vers la corbeille.');
      navigate('/document-library');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreDocument.mutateAsync(id);
      toast.success('Document restauré.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleAddTag = async (event) => {
    event.preventDefault();
    const value = newTag.trim();
    if (!value) return;
    try {
      await addTags.mutateAsync({ documentId: id, tags: [value] });
      setNewTag('');
      toast.success(`Étiquette « ${value} » ajoutée.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleRemoveTag = async (name) => {
    try {
      await removeTags.mutateAsync({ documentId: id, tags: [name] });
      toast.success(`Étiquette « ${name} » retirée.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={headerUser} onLogout={handleLogout} />
        <main id="main-content" tabIndex={-1} className="pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4" aria-busy="true">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={headerUser} onLogout={handleLogout} />
        <main id="main-content" tabIndex={-1} className="pt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EmptyState
              icon="FileX"
              title="Document introuvable"
              description="Ce document n'existe pas ou vous n'avez pas les droits pour le consulter."
              action={
                <Button variant="outline" onClick={() => navigate('/document-library')}>
                  Retour à la bibliothèque
                </Button>
              }
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb
            customItems={[
              { label: 'Accueil', path: '/dashboard', icon: 'Home' },
              { label: 'Bibliothèque', path: '/document-library', icon: 'FolderOpen' },
              { label: doc.title, isLast: true },
            ]}
          />

          {/* En-tête + actions activées par les droits réels */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl lg:text-3xl font-heading font-bold text-foreground break-words">
                  {doc.title}
                </h1>
                <Badge variant={status.variant} className="font-caption">
                  {status.label}
                </Badge>
                <Badge variant={confidentiality.variant} className="font-caption">
                  {confidentiality.label}
                </Badge>
                {doc.is_encrypted && (
                  <Badge variant="info" className="font-caption">
                    Chiffré
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-caption">
                Ajouté le {formatDateTime(doc.created_at)} · modifié le{' '}
                {formatDateTime(doc.updated_at)} · {formatFileSize(doc.size_bytes)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                iconName="FileText"
                iconPosition="left"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!rights.view?.allowed}
                className="font-body"
              >
                Aperçu
              </Button>
              {rights.edit?.allowed && (
                <Button
                  variant="outline"
                  iconName="FilePlus"
                  iconPosition="left"
                  onClick={() => versionInputRef.current?.click()}
                  disabled={busy}
                  className="font-body"
                >
                  Nouvelle version
                </Button>
              )}
              <input
                ref={versionInputRef}
                type="file"
                className="hidden"
                onChange={handleAddVersion}
              />
              <Button
                variant="default"
                iconName="Download"
                iconPosition="left"
                onClick={handleDownload}
                disabled={!rights.download?.allowed}
                loading={busy}
                className="font-body"
              >
                Télécharger
              </Button>
              {doc.status === 'deleted' ? (
                rights.edit?.allowed && (
                  <Button
                    variant="success"
                    iconName="RotateCcw"
                    iconPosition="left"
                    onClick={handleRestore}
                    className="font-body"
                  >
                    Restaurer
                  </Button>
                )
              ) : (
                rights.delete?.allowed && (
                  <Button
                    variant="danger"
                    iconName="Trash2"
                    iconPosition="left"
                    onClick={handleDelete}
                    className="font-body"
                  >
                    Corbeille
                  </Button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale : métadonnées + versions */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-card border border-border rounded-lg shadow-card p-6">
                <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
                  Informations
                </h2>
                {doc.description && (
                  <p className="font-body text-sm text-muted-foreground mb-4">
                    {doc.description}
                  </p>
                )}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <dt className="font-caption text-xs text-muted-foreground uppercase">Département</dt>
                    <dd className="font-body text-sm text-foreground">
                      {doc.department_id ? `#${doc.department_id}` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-caption text-xs text-muted-foreground uppercase">Type</dt>
                    <dd className="font-body text-sm text-foreground">
                      {doc.doc_type_id ? `#${doc.doc_type_id}` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-caption text-xs text-muted-foreground uppercase">Dossier</dt>
                    <dd className="font-body text-sm text-foreground">
                      {doc.folder_id ? `#${doc.folder_id}` : 'Racine'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-caption text-xs text-muted-foreground uppercase">
                      Fin de conservation
                    </dt>
                    <dd className="font-body text-sm text-foreground">
                      {doc.retention_expires_at ? formatDateTime(doc.retention_expires_at) : '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="bg-card border border-border rounded-lg shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading font-semibold text-lg text-foreground">
                    Historique des versions
                  </h2>
                  <span className="font-caption text-xs text-muted-foreground">
                    {versions.length} version{versions.length > 1 ? 's' : ''}
                  </span>
                </div>

                {versionsQuery.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : versions.length === 0 ? (
                  <EmptyState icon="History" title="Aucune version" />
                ) : (
                  <ul className="divide-y divide-border">
                    {versions.map((version) => (
                      <li
                        key={version.version_id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-body text-sm text-foreground">
                            Version {version.version_number}
                            {version.change_note ? ` — ${version.change_note}` : ''}
                          </p>
                          <p className="font-caption text-xs text-muted-foreground">
                            {formatDateTime(version.uploaded_at)} · {version.mime_type || 'fichier'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            iconName="Download"
                            iconPosition="left"
                            onClick={() =>
                              documentsApi
                                .downloadVersion(id, version.version_id, `${doc.title}.bin`)
                                .then((name) => toast.success(`Téléchargement « ${name} » lancé.`))
                                .catch((error) => toast.error(toAppError(error).message))
                            }
                            disabled={!rights.download?.allowed}
                            className="font-body text-xs"
                          >
                            Télécharger
                          </Button>
                          {rights.edit?.allowed && version.version_number !== versions[0].version_number && (
                            <Button
                              variant="outline"
                              size="sm"
                              iconName="RotateCcw"
                              iconPosition="left"
                              onClick={() => handleRestoreVersion(version)}
                              className="font-body text-xs"
                            >
                              Restaurer
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Colonne latérale : droits + étiquettes */}
            <div className="space-y-6">
              <section className="bg-card border border-border rounded-lg shadow-card p-6">
                <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
                  Vos droits
                </h2>
                <p className="font-caption text-xs text-muted-foreground mb-4">
                  Source : {ruleSummary}
                </p>
                <ul className="space-y-2">
                  {Object.entries(RIGHT_LABELS).map(([key, meta]) => {
                    const allowed = Boolean(rights[key]?.allowed);
                    return (
                      <li key={key} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-body text-sm text-foreground">
                          <Icon name={meta.icon} size={14} className="text-muted-foreground" />
                          {meta.label}
                        </span>
                        <Badge variant={allowed ? 'success' : 'neutral'} className="font-caption">
                          {allowed ? 'Autorisé' : 'Refusé'}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="bg-card border border-border rounded-lg shadow-card p-6">
                <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
                  Étiquettes
                </h2>

                {(doc.tags || []).length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground mb-4">
                    Aucune étiquette.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag.tag_id || tag.name}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                      >
                        {tag.name}
                        {rights.edit?.allowed && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag.name)}
                            aria-label={`Retirer l'étiquette ${tag.name}`}
                            className="text-muted-foreground hover:text-error"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {rights.edit?.allowed ? (
                  <form onSubmit={handleAddTag} className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(event) => setNewTag(event.target.value)}
                      placeholder="Ajouter une étiquette"
                      aria-label="Nouvelle étiquette"
                    />
                    <Button type="submit" variant="outline" iconName="Plus" title="Ajouter" />
                  </form>
                ) : (
                  <p className="font-caption text-xs text-muted-foreground">
                    Lecture seule : droits de modification non accordés.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      <DocumentPreviewModal
        document={doc}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={handleDownload}
        onOpenDetail={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default DocumentDetail;
