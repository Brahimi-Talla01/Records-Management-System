import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import UploadZone from './components/UploadZone';
import UploadProgress from './components/UploadProgress';
import DocumentMetadataForm from './components/DocumentMetadataForm';
import ScannerIntegration from './components/ScannerIntegration';
import BatchUploadManager from './components/BatchUploadManager';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const DocumentUpload = () => {
  const [user] = useState({
    id: 1,
    name: 'Marie Dubois',
    email: 'marie.dubois@universite.fr',
    role: 'admin',
    department: 'Administration'
  });

  const [uploadQueue, setUploadQueue] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [showBatchManager, setShowBatchManager] = useState(false);

  const acceptedFormats = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.tiff'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    // Simulate some existing uploads in queue
    const mockQueue = [
      {
        id: 'file-1',
        name: 'Rapport_Annuel_2024.pdf',
        size: 2.5 * 1024 * 1024,
        status: 'completed',
        progress: 100,
        uploadedAt: new Date(Date.now() - 300000),
        ocrStatus: 'completed'
      },
      {
        id: 'file-2',
        name: 'Thèse_Informatique_Martin.docx',
        size: 15.2 * 1024 * 1024,
        status: 'uploading',
        progress: 65,
        estimatedTime: 45
      }
    ];
    setUploadQueue(mockQueue);
  }, []);

  const handleFilesSelected = (files) => {
    const newFiles = files?.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file?.name,
      size: file?.size,
      status: 'pending',
      progress: 0,
      file: file,
      addedAt: new Date()
    }));

    // Validate files
    const validFiles = newFiles?.filter(file => {
      const extension = '.' + file?.name?.split('.')?.pop()?.toLowerCase();
      return acceptedFormats?.includes(extension) && file?.size <= maxFileSize;
    });

    const invalidFiles = newFiles?.filter(file => {
      const extension = '.' + file?.name?.split('.')?.pop()?.toLowerCase();
      return !acceptedFormats?.includes(extension) || file?.size > maxFileSize;
    });

    // Add error status for invalid files
    const invalidFilesWithError = invalidFiles?.map(file => ({
      ...file,
      status: 'error',
      error: file?.size > maxFileSize 
        ? `Fichier trop volumineux (max ${maxFileSize / (1024 * 1024)}MB)`
        : 'Format de fichier non supporté'
    }));

    setUploadQueue(prev => [...prev, ...validFiles, ...invalidFilesWithError]);
    setSelectedFiles(validFiles);
  };

  const handleRemoveFile = (fileId) => {
    setUploadQueue(prev => prev?.filter(file => file?.id !== fileId));
    setSelectedFiles(prev => prev?.filter(file => file?.id !== fileId));
  };

  const handleRetryUpload = (fileId) => {
    setUploadQueue(prev => prev?.map(file => 
      file?.id === fileId 
        ? { ...file, status: 'pending', error: null, progress: 0 }
        : file
    ));
  };

  const handleMetadataSubmit = async (metadata) => {
    setIsUploading(true);
    
    try {
      // Simulate upload process
      for (const file of selectedFiles) {
        setUploadQueue(prev => prev?.map(f => 
          f?.id === file?.id 
            ? { ...f, status: 'uploading', progress: 0, metadata }
            : f
        ));

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setUploadQueue(prev => prev?.map(f => 
            f?.id === file?.id 
              ? { 
                  ...f, 
                  progress, 
                  estimatedTime: Math.max(0, Math.floor((100 - progress) * 0.5))
                }
              : f
          ));
        }

        // Mark as completed
        setUploadQueue(prev => prev?.map(f => 
          f?.id === file?.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100, 
                estimatedTime: 0,
                ocrStatus: metadata?.enableOCR ? 'processing' : 'disabled',
                uploadedAt: new Date()
              }
            : f
        ));

        // Simulate OCR processing if enabled
        if (metadata?.enableOCR) {
          setTimeout(() => {
            setUploadQueue(prev => prev?.map(f => 
              f?.id === file?.id 
                ? { ...f, ocrStatus: 'completed' }
                : f
            ));
          }, 2000);
        }
      }

      // Clear selected files after successful upload
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScannedDocument = (scannedData) => {
    const scannedFile = {
      id: `scanned-${Date.now()}`,
      name: `Document_Numérisé_${new Date()?.toLocaleDateString('fr-FR')}.pdf`,
      size: 3.2 * 1024 * 1024, // Mock size
      status: 'completed',
      progress: 100,
      scannedData,
      uploadedAt: new Date(),
      ocrStatus: scannedData?.settings?.enableOCR ? 'completed' : 'disabled'
    };

    setUploadQueue(prev => [...prev, scannedFile]);
  };

  const handleApplyBatchMetadata = async (fileIds, metadata) => {
    // Apply metadata to selected files
    setUploadQueue(prev => prev?.map(file => 
      fileIds?.includes(file?.id)
        ? { ...file, metadata, status: file?.status === 'pending' ? 'ready' : file?.status }
        : file
    ));
  };

  const handleProcessBatch = (fileIds) => {
    // Process selected files
    fileIds?.forEach(fileId => {
      const file = uploadQueue?.find(f => f?.id === fileId);
      if (file && file?.metadata) {
        handleMetadataSubmit(file?.metadata);
      }
    });
  };

  const handleLogout = () => {
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'upload', label: 'Téléchargement', icon: 'Upload' },
    { id: 'scanner', label: 'Numérisation', icon: 'Scanner' },
    { id: 'batch', label: 'Traitement par lot', icon: 'Package' }
  ];

  const completedUploads = uploadQueue?.filter(file => file?.status === 'completed')?.length;
  const totalUploads = uploadQueue?.length;
  const pendingUploads = uploadQueue?.filter(file => file?.status === 'pending' || file?.status === 'uploading')?.length;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="Upload" size={24} color="white" />
                </div>
                <div>
                  <h1 className="text-3xl font-heading font-bold text-foreground">
                    Téléchargement de documents
                  </h1>
                  <p className="text-muted-foreground font-body mt-1">
                    Téléchargez et numérisez vos documents universitaires
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  iconName="FolderOpen"
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => window.location.href = '/document-library'}
                >
                  Voir la bibliothèque
                </Button>
                
                <Button
                  variant="outline"
                  iconName="Search"
                  iconPosition="left"
                  iconSize={16}
                  onClick={() => window.location.href = '/advanced-search'}
                >
                  Recherche avancée
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="CheckCircle" size={20} className="text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">Documents terminés</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{completedUploads}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="Clock" size={20} className="text-warning" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">En cours</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{pendingUploads}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center space-x-3">
                  <Icon name="Files" size={20} className="text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground font-caption">Total</p>
                    <p className="text-xl font-heading font-semibold text-foreground">{totalUploads}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                {tabs?.map((tab) => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-body font-medium text-sm transition-colors ${
                      activeTab === tab?.id
                        ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                    }`}
                  >
                    <Icon name={tab?.icon} size={16} />
                    <span>{tab?.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {activeTab === 'upload' && (
              <>
                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  acceptedFormats={acceptedFormats}
                  maxFileSize={maxFileSize}
                  isUploading={isUploading}
                />

                {selectedFiles?.length > 0 && (
                  <DocumentMetadataForm
                    onSubmit={handleMetadataSubmit}
                    isSubmitting={isUploading}
                    selectedFiles={selectedFiles}
                  />
                )}

                <UploadProgress
                  uploadQueue={uploadQueue}
                  onRemoveFile={handleRemoveFile}
                  onRetryUpload={handleRetryUpload}
                />
              </>
            )}

            {activeTab === 'scanner' && (
              <ScannerIntegration
                onScannedDocument={handleScannedDocument}
                isScanning={isScanning}
              />
            )}

            {activeTab === 'batch' && (
              <BatchUploadManager
                uploadQueue={uploadQueue}
                onApplyBatchMetadata={handleApplyBatchMetadata}
                onProcessBatch={handleProcessBatch}
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-heading font-semibold text-foreground mb-4">
              Actions rapides
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                iconName="Camera"
                iconPosition="left"
                iconSize={16}
                onClick={() => setActiveTab('scanner')}
                fullWidth
                className="justify-start"
              >
                Numériser un document
              </Button>

              <Button
                variant="outline"
                iconName="Package"
                iconPosition="left"
                iconSize={16}
                onClick={() => setActiveTab('batch')}
                fullWidth
                className="justify-start"
              >
                Traitement par lot
              </Button>

              <Button
                variant="outline"
                iconName="FolderOpen"
                iconPosition="left"
                iconSize={16}
                onClick={() => window.location.href = '/document-library'}
                fullWidth
                className="justify-start"
              >
                Bibliothèque
              </Button>

              <Button
                variant="outline"
                iconName="Settings"
                iconPosition="left"
                iconSize={16}
                fullWidth
                className="justify-start"
              >
                Paramètres
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;