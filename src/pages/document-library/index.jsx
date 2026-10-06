/**
 * Bibliothèque de documents (F3).
 *
 * Toute la vue (filtres, tri, page, dossier, pagination) vit dans l'URL :
 * une URL copiée rouvre la même vue et le retour navigateur conserve les filtres.
 * Aucune donnée serveur en useState (règle M12) — seule la sélection
 * d'affichage, qui n'existe que côté client, est locale.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useToast } from '../../components/ui/useToast';
import { useConfirm } from '../../components/ui/useConfirm';
import FolderNavigation from './components/FolderNavigation';
import DocumentFilters from './components/DocumentFilters';
import DocumentTable from './components/DocumentTable';
import DocumentGrid from './components/DocumentGrid';
import BulkActionBar from './components/BulkActionBar';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import { useAuth, isAdmin, hasRole } from '../../features/auth';
import {
  useDocuments,
  useDeleteDocument,
  useRestoreDocument,
  useBulkDocuments,
  documentsApi,
  parseLibraryParams,
  toSearchParams,
  toListQuery,
  countActiveFilters,
} from '../../features/documents';
import {
  useFolderTree,
  useFolderPath,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '../../features/folders';
import { useDocTypes, useTags, useDepartments } from '../../features/referentials';
import { toAppError } from '../../lib/errors';
import { mapBackendRole } from '../../lib/formatters';

const DocumentLibrary = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, logout } = useAuth();

  // --- Vue = URL (source unique de vérité) ---
  const [searchParams, setSearchParams] = useSearchParams();
  const view = useMemo(() => parseLibraryParams(searchParams), [searchParams]);
  const query = useMemo(() => toListQuery(view), [view]);

  const patchView = (patch, { replace = false } = {}) => {
    setSearchParams(toSearchParams({ ...view, ...patch }), { replace });
  };

  // --- Données serveur ---
  const documentsQuery = useDocuments(query);
  const treeQuery = useFolderTree();
  const pathQuery = useFolderPath(view.folder_id);
  const docTypesQuery = useDocTypes();
  const tagsQuery = useTags();
  const departmentsQuery = useDepartments();

  const deleteDocument = useDeleteDocument();
  const restoreDocument = useRestoreDocument();
  const bulkDocuments = useBulkDocuments();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  // --- Sélection (état d'affichage, pas de donnée serveur) ---
  const [selected, setSelected] = useState([]);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [busy, setBusy] = useState(false);

  const data = documentsQuery.data;
  const documents = data?.items || [];
  const isDeletedView = view.status === 'deleted';

  // Dossier : création/édition = Admin·Secrétaire, suppression = Admin (miroir serveur).
  const canWriteFolders = hasRole(me, ['Admin', 'Secretaire']);
  const canManageFolders = isAdmin(me);
  const canDeleteDocuments = isAdmin(me);

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte côté serveur
    } finally {
      navigate('/login');
    }
  };

  const handleSort = (column) => {
    const nextOrder = view.sort === column && view.order === 'asc' ? 'desc' : 'asc';
    patchView({ sort: column, order: nextOrder, page: 1, cursor: null });
  };

  // Vue grille : le tri n'a plus d'en-têtes de colonnes, il est choisi par un
  // sélecteur qui fixe explicitement la colonne ET le sens.
  const handleSortSelect = (column, nextOrder) => {
    patchView({ sort: column, order: nextOrder, page: 1, cursor: null });
  };

  const handleOpen = (document) => navigate(`/document-library/${document.document_id}`);

  const handleToggle = (documentId, checked) => {
    setSelected((prev) =>
      checked ? [...prev, documentId] : prev.filter((id) => id !== documentId)
    );
  };

  const handleToggleAll = (checked) => {
    setSelected(checked ? documents.map((doc) => doc.document_id) : []);
  };

  /** Télécharge la dernière version connue du document. */
  const handleDownload = async (document) => {
    try {
      const detail = await documentsApi.get(document.document_id);
      const latest = (detail.versions || [])[0];
      if (!latest) {
        toast.warning('Ce document n’a encore aucune version.');
        return;
      }
      const name = await documentsApi.downloadVersion(
        document.document_id,
        latest.version_id,
        `${document.title}.bin`
      );
      toast.success(`Téléchargement « ${name} » lancé.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleDeleteOne = async (document) => {
    const ok = await confirm({
      title: 'Mettre à la corbeille',
      description: `« ${document.title} » sera déplacé vers la corbeille (restaurable).`,
      confirmLabel: 'Mettre à la corbeille',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteDocument.mutateAsync(document.document_id);
      toast.success('Document déplacé vers la corbeille.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleRestoreOne = async (document) => {
    try {
      await restoreDocument.mutateAsync(document.document_id);
      toast.success('Document restauré.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleBulk = async (payload) => {
    const verbs = {
      delete: 'mettre à la corbeille',
      restore: 'restaurer',
      move: 'déplacer',
      confidentiality: 'changer la confidentialité de',
    };
    const ok = await confirm({
      title: 'Confirmer l’action groupée',
      description: `Voulez-vous ${verbs[payload.action]} ${payload.ids.length} document(s) ?`,
      confirmLabel: 'Appliquer',
      variant: payload.action === 'delete' ? 'danger' : 'default',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const result = await bulkDocuments.mutateAsync(payload);
      setSelected([]);
      toast.success(`${result.updated.length} document(s) traité(s).`);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const name = await documentsApi.exportCsv(query);
      toast.success(`Export « ${name} » téléchargé.`);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleFolderAction = (mutation, onSuccess) => async (...args) => {
    try {
      await mutation(...args);
      onSuccess?.();
    } catch (error) {
      toast.error(toAppError(error).message);
      throw error;
    }
  };

  // Pagination offset (page/pages) ou clé (has_more/next_cursor)
  const isKeyset = query.pagination === 'keyset';
  const totalPages = data?.pages || 1;
  const currentPage = data?.page || view.page || 1;
  const hasMore = isKeyset ? Boolean(data?.has_more) : currentPage < totalPages;

  const goToPage = (page) => patchView({ page });
  const goNextKeyset = () =>
    patchView({ cursor: data?.next_cursor || null, page: (view.page || 1) + 1 });

  const viewMode = view.view === 'grid' ? 'grid' : 'table';

  const activeFilters = countActiveFilters(view);
  const resultsLabel = data
    ? `${data.total ?? data.items?.length ?? 0} document${
        (data.total ?? 0) > 1 ? 's' : ''
      }${activeFilters ? ' trouvé(s)' : ''}`
    : 'Chargement…';

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb />

          {/* En-tête */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                Bibliothèque de documents
              </h1>
              <p className="font-body text-muted-foreground mt-2">
                {isDeletedView
                  ? 'Documents de la corbeille : restaurez-les ou supprimez-les définitivement.'
                  : 'Parcourez, filtrez et gérez les archives universitaires.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Bascule grille / lignes (choix d'affichage conservé dans l'URL) */}
              <div
                className="inline-flex items-center rounded-md border border-border overflow-hidden"
                role="group"
                aria-label="Mode d'affichage"
              >
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={viewMode === 'table'}
                  aria-label="Affichage en lignes"
                  title="Affichage en lignes"
                  onClick={() => patchView({ view: 'table' })}
                  className="rounded-none"
                >
                  <Icon name="List" size={16} />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Affichage en grille"
                  title="Affichage en grille"
                  onClick={() => patchView({ view: 'grid' })}
                  className="rounded-none"
                >
                  <Icon name="Grid3X3" size={16} />
                </Button>
              </div>
              <Button
                variant="outline"
                iconName="Download"
                iconPosition="left"
                onClick={handleExport}
                disabled={busy}
                className="font-body"
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                iconName="Grid3X3"
                iconPosition="left"
                onClick={() => patchView({ pagination: isKeyset ? null : 'keyset', page: 1, cursor: null })}
                title="Basculer entre pagination par page et pagination par clé"
                className="font-body"
              >
                {isKeyset ? 'Pagination clé' : 'Pagination par page'}
              </Button>
              <Button
                variant="default"
                iconName="Upload"
                iconPosition="left"
                onClick={() => navigate('/document-upload')}
                className="font-body"
              >
                Télécharger
              </Button>
            </div>
          </div>

          {/* Dossiers */}
          <div className="mb-6">
            <FolderNavigation
              tree={treeQuery.data || []}
              path={pathQuery.data || []}
              currentFolderId={view.folder_id}
              canWrite={canWriteFolders}
              canManage={canManageFolders}
              onSelect={(folderId) => patchView({ folder_id: folderId, page: 1, cursor: null })}
              onCreate={handleFolderAction((payload) => createFolder.mutateAsync(payload))}
              onRename={(folderId, payload) =>
                handleFolderAction((id, body) => updateFolder.mutateAsync({ folderId: id, payload: body }))(
                  folderId,
                  payload
                )
              }
              onDelete={handleFolderAction((folderId) => deleteFolder.mutateAsync(folderId))}
            />
          </div>

          {/* Filtres */}
          <div className="mb-6">
            <DocumentFilters
              filters={view}
              onChange={(patch) => patchView({ ...patch, cursor: null })}
              onClear={() =>
                patchView({
                  q: null,
                  department_id: null,
                  doc_type_id: null,
                  confidentiality: null,
                  tag_ids: null,
                  created_from: null,
                  created_to: null,
                  page: 1,
                  cursor: null,
                })
              }
              docTypes={docTypesQuery.data || []}
              departments={departmentsQuery.data || []}
              tags={tagsQuery.data || []}
              resultsLabel={resultsLabel}
            />
          </div>

          {/* Liste : tableau (lignes) ou cartes (grille) */}
          {viewMode === 'grid' ? (
            <DocumentGrid
              documents={documents}
              isLoading={documentsQuery.isLoading}
              selected={selected}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              onOpen={handleOpen}
              onPreview={setPreviewDocument}
              onChangeSort={handleSortSelect}
              sort={view.sort || 'created_at'}
              order={view.order || 'desc'}
              canEdit={canWriteFolders}
              canDelete={canDeleteDocuments}
              isDeletedView={isDeletedView}
              onRestore={handleRestoreOne}
              onDelete={handleDeleteOne}
              emptyTitle={isDeletedView ? 'Corbeille vide' : 'Aucun document'}
              emptyDescription={
                isDeletedView
                  ? 'Aucun document dans la corbeille.'
                  : 'Aucun document ne correspond aux critères de recherche.'
              }
              emptyAction={
                !isDeletedView && activeFilters === 0 ? (
                  <Button
                    variant="default"
                    iconName="Upload"
                    iconPosition="left"
                    onClick={() => navigate('/document-upload')}
                  >
                    Déposer un premier document
                  </Button>
                ) : null
              }
            />
          ) : (
            <DocumentTable
              documents={documents}
              isLoading={documentsQuery.isLoading}
              selected={selected}
              onToggle={handleToggle}
              onToggleAll={handleToggleAll}
              onOpen={handleOpen}
              onPreview={setPreviewDocument}
              onSort={handleSort}
              sort={view.sort || 'created_at'}
              order={view.order || 'desc'}
              canEdit={canWriteFolders}
              canDelete={canDeleteDocuments}
              isDeletedView={isDeletedView}
              onRestore={handleRestoreOne}
              onDelete={handleDeleteOne}
              emptyTitle={isDeletedView ? 'Corbeille vide' : 'Aucun document'}
              emptyDescription={
                isDeletedView
                  ? 'Aucun document dans la corbeille.'
                  : 'Aucun document ne correspond aux critères de recherche.'
              }
              emptyAction={
                !isDeletedView && activeFilters === 0 ? (
                  <Button
                    variant="default"
                    iconName="Upload"
                    iconPosition="left"
                    onClick={() => navigate('/document-upload')}
                  >
                    Déposer un premier document
                  </Button>
                ) : null
              }
            />
          )}

          {/* Pagination */}
          {documents.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-body">
                {isKeyset
                  ? `Page ${currentPage}`
                  : `Page ${currentPage} sur ${totalPages} — ${data?.total ?? 0} résultat(s)`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="ArrowLeft"
                  iconPosition="left"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    isKeyset ? patchView({ page: currentPage - 1 }) : goToPage(currentPage - 1)
                  }
                  className="font-body"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  iconName="ChevronRight"
                  iconPosition="right"
                  disabled={!hasMore || (isKeyset && !data?.next_cursor)}
                  onClick={() => (isKeyset ? goNextKeyset() : goToPage(currentPage + 1))}
                  className="font-body"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}

          {/* Aperçu */}
          <DocumentPreviewModal
            document={previewDocument}
            isOpen={Boolean(previewDocument)}
            onClose={() => setPreviewDocument(null)}
            onDownload={handleDownload}
            onOpenDetail={(doc) => {
              setPreviewDocument(null);
              handleOpen(doc);
            }}
          />
        </div>
      </div>

      {/* Actions groupées */}
      <BulkActionBar
        selected={selected}
        isDeletedView={isDeletedView}
        folders={treeQuery.data || []}
        onClear={() => setSelected([])}
        onApply={handleBulk}
        busy={busy}
      />
    </div>
  );
};

export default DocumentLibrary;
