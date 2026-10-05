/**
 * Dépôt de documents (F4).
 *
 * Dépôt réel : `POST /api/documents` (multipart) pour chaque fichier de la
 * file, avec progression XHR (`onUploadProgress`), annulation par
 * `AbortController` et nouvelle tentative. Les limites (taille, extensions) et
 * l'OCR viennent de `GET /api/settings/public` — plus aucune constante locale.
 * La file est de l'état purement client (M12) : aucune donnée serveur.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useToast } from '../../components/ui/useToast';
import UploadZone from './components/UploadZone';
import UploadProgress from './components/UploadProgress';
import DocumentMetadataForm from './components/DocumentMetadataForm';
import ScannerIntegration from './components/ScannerIntegration';
import { useAuth } from '../../features/auth';
import { usePublicSettings } from '../../features/settings';
import { useCreateDocument } from '../../features/documents';
import { useDocTypes, useDepartments } from '../../features/referentials';
import { useFolderTree } from '../../features/folders';
import { toAppError } from '../../lib/errors';
import { mapBackendRole } from '../../lib/formatters';
import { validateFile, fileBaseName, progressPercent } from '../../lib/upload';

/** Nombre de dépôts menés en parallèle (le backend limite à 30 req/min). */
const CONCURRENCY = 2;

const DocumentUpload = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me, logout } = useAuth();
  const { upload } = usePublicSettings();

  const createDocument = useCreateDocument();
  const docTypesQuery = useDocTypes();
  const departmentsQuery = useDepartments();
  const foldersQuery = useFolderTree();

  const [activeTab, setActiveTab] = useState('upload');
  const [queue, setQueue] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [busy, setBusy] = useState(false);
  const controllers = useRef(new Map());

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

  const patchItem = (id, patch) =>
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  /** Ajoute des fichiers à la file : contrôle client avant envoi (F4.2). */
  const handleFilesSelected = (files) => {
    const incoming = files.map((file, index) => {
      const check = validateFile(file, {
        allowedExtensions: upload.allowedExtensions,
        maxSizeMb: upload.maxUploadMb,
      });
      return {
        id: `file-${Date.now()}-${index}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        title: fileBaseName(file.name),
        status: check.ok ? 'pending' : 'error',
        progress: 0,
        error: check.ok ? null : check.message,
      };
    });
    setQueue((prev) => [...prev, ...incoming]);
    const refused = incoming.filter((item) => item.status === 'error').length;
    if (refused) {
      toast.warning(`${refused} fichier(s) refusé(s) avant envoi.`);
    }
  };

  const handleRenameFile = (id, title) => patchItem(id, { title });

  const handleRemoveFile = (id) => {
    if (controllers.current.has(id)) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCancelUpload = (id) => controllers.current.get(id)?.abort();

  /** Dépôt d'un fichier : progression réelle + statut OCR. */
  const uploadOne = async (item, payload) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    patchItem(item.id, { status: 'uploading', progress: 0, error: null });

    const title = (item.title || fileBaseName(item.name)).trim() || item.name;
    try {
      const document = await createDocument.mutateAsync({
        payload: { ...payload, title },
        file: item.file,
        signal: controller.signal,
        onUploadProgress: (event) => patchItem(item.id, { progress: progressPercent(event) }),
      });
      patchItem(item.id, {
        status: 'completed',
        progress: 100,
        documentId: document.document_id,
        title: document.title,
        ocrStatus: upload.ocrEnabled ? 'completed' : 'disabled',
      });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'request_canceled') {
        patchItem(item.id, { status: 'canceled', progress: 0, error: null });
      } else {
        patchItem(item.id, { status: 'error', error: appError.message });
      }
    } finally {
      controllers.current.delete(item.id);
    }
  };

  /** File d'attente bornée : `CONCURRENCY` dépôts simultanés au maximum. */
  const runUpload = async (items, payload) => {
    if (!items.length) {
      toast.warning('Aucun fichier à déposer.');
      return;
    }
    setBusy(true);
    let cursor = 0;
    const worker = async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await uploadOne(item, payload);
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMetadataSubmit = (payload) => {
    setMetadata(payload);
    const items = queue.filter((item) => item.status === 'pending');
    return runUpload(items, payload);
  };

  const handleRetryUpload = (id) => {
    const item = queue.find((entry) => entry.id === id);
    if (item) runUpload([item], metadata || {});
  };

  const handleClearCompleted = () =>
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));

  const pendingItems = queue.filter((item) => item.status === 'pending');
  const completed = queue.filter((item) => item.status === 'completed').length;
  const inProgress = queue.filter((item) =>
    ['pending', 'uploading'].includes(item.status)
  ).length;

  const tabs = [
    { id: 'upload', label: 'Téléchargement', icon: 'Upload' },
    { id: 'scanner', label: 'Numérisation', icon: 'Scanner' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Upload" size={24} className="text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-heading font-bold text-foreground">
                    Dépôt de documents
                  </h1>
                  <p className="text-muted-foreground font-body mt-1">
                    Déposez vos documents universitaires dans la bibliothèque
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                iconName="FolderOpen"
                iconPosition="left"
                iconSize={16}
                onClick={() => navigate('/document-library')}
              >
                Voir la bibliothèque
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="CheckCircle" size={20} className="text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">Déposés</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{completed}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="Clock" size={20} className="text-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">En attente</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{inProgress}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="Files" size={20} className="text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">Total</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{queue.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-body font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="space-y-8">
            {activeTab === 'upload' && (
              <>
                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  acceptedFormats={upload.allowedExtensions.map((ext) => `.${ext}`)}
                  maxFileSize={upload.maxUploadMb * 1024 * 1024}
                  isUploading={busy}
                />

                {pendingItems.length > 0 && (
                  <DocumentMetadataForm
                    onSubmit={handleMetadataSubmit}
                    isSubmitting={busy}
                    selectedCount={pendingItems.length}
                    docTypes={docTypesQuery.data || []}
                    departments={departmentsQuery.data || []}
                    folders={foldersQuery.data || []}
                    ocrEnabled={upload.ocrEnabled}
                  />
                )}

                <UploadProgress
                  uploadQueue={queue}
                  onRemoveFile={handleRemoveFile}
                  onRetryUpload={handleRetryUpload}
                  onCancelUpload={handleCancelUpload}
                  onRenameFile={handleRenameFile}
                  onClearCompleted={handleClearCompleted}
                />
              </>
            )}

            {activeTab === 'scanner' && (
              <ScannerIntegration scannerEnabled={upload.scannerEnabled} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
