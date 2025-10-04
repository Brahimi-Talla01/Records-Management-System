import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const ScannerIntegration = ({ onScannedDocument, isScanning }) => {
  const [scanSettings, setScanSettings] = useState({
    resolution: '300',
    colorMode: 'color',
    format: 'pdf',
    autoDetectPages: true,
    enableOCR: true,
    ocrLanguage: 'fr'
  });

  const [connectedScanners, setConnectedScanners] = useState([
    { id: 'scanner-1', name: 'Canon ImageRunner 2625i', status: 'connected', location: 'Bureau 101' },
    { id: 'scanner-2', name: 'HP ScanJet Pro 2500', status: 'connected', location: 'Bibliothèque' },
    { id: 'scanner-3', name: 'Epson WorkForce DS-780N', status: 'offline', location: 'Secrétariat' }
  ]);

  const [selectedScanner, setSelectedScanner] = useState('scanner-1');
  const [previewPages, setPreviewPages] = useState([]);

  const resolutionOptions = [
    { value: '150', label: '150 DPI (Brouillon)' },
    { value: '300', label: '300 DPI (Standard)' },
    { value: '600', label: '600 DPI (Haute qualité)' },
    { value: '1200', label: '1200 DPI (Très haute qualité)' }
  ];

  const colorModeOptions = [
    { value: 'color', label: 'Couleur' },
    { value: 'grayscale', label: 'Niveaux de gris' },
    { value: 'blackwhite', label: 'Noir et blanc' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'tiff', label: 'TIFF' }
  ];

  const ocrLanguageOptions = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'Anglais' },
    { value: 'es', label: 'Espagnol' },
    { value: 'de', label: 'Allemand' }
  ];

  const handleSettingChange = (field, value) => {
    setScanSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartScan = () => {
    // Mock scanning process
    const mockPages = [
      {
        id: 1,
        thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&h=280&fit=crop',
        status: 'scanned',
        ocrText: 'Document page 1 content...'
      },
      {
        id: 2,
        thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=280&fit=crop',
        status: 'scanned',
        ocrText: 'Document page 2 content...'
      }
    ];
    
    setTimeout(() => {
      setPreviewPages(mockPages);
      onScannedDocument({
        pages: mockPages,
        settings: scanSettings,
        scanner: connectedScanners?.find(s => s?.id === selectedScanner)
      });
    }, 3000);
  };

  const handleRemovePage = (pageId) => {
    setPreviewPages(prev => prev?.filter(page => page?.id !== pageId));
  };

  const getScannerOptions = () => {
    return connectedScanners?.filter(scanner => scanner?.status === 'connected')?.map(scanner => ({
        value: scanner?.id,
        label: `${scanner?.name} (${scanner?.location})`
      }));
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="Scanner" size={24} className="text-primary" />
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              Numérisation de documents
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              Numérisez directement depuis les scanners universitaires
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Scanner Selection */}
        <div>
          <Select
            label="Scanner disponible"
            options={getScannerOptions()}
            value={selectedScanner}
            onChange={(value) => setSelectedScanner(value)}
            placeholder="Sélectionnez un scanner"
          />
          
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {connectedScanners?.map((scanner) => (
              <div
                key={scanner?.id}
                className={`p-3 border rounded-lg ${
                  scanner?.status === 'connected' ?'border-success bg-success/5' :'border-error bg-error/5'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon 
                    name={scanner?.status === 'connected' ? 'CheckCircle' : 'XCircle'} 
                    size={16} 
                    className={scanner?.status === 'connected' ? 'text-success' : 'text-error'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-foreground truncate">
                      {scanner?.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-caption">
                      {scanner?.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scan Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-body font-medium text-foreground">Paramètres de numérisation</h4>
            
            <Select
              label="Résolution"
              options={resolutionOptions}
              value={scanSettings?.resolution}
              onChange={(value) => handleSettingChange('resolution', value)}
            />

            <Select
              label="Mode couleur"
              options={colorModeOptions}
              value={scanSettings?.colorMode}
              onChange={(value) => handleSettingChange('colorMode', value)}
            />

            <Select
              label="Format de sortie"
              options={formatOptions}
              value={scanSettings?.format}
              onChange={(value) => handleSettingChange('format', value)}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-body font-medium text-foreground">Options avancées</h4>
            
            <Checkbox
              label="Détection automatique des pages"
              description="Détecter automatiquement les limites des pages"
              checked={scanSettings?.autoDetectPages}
              onChange={(e) => handleSettingChange('autoDetectPages', e?.target?.checked)}
            />

            <Checkbox
              label="Activer l'OCR"
              description="Reconnaissance optique de caractères"
              checked={scanSettings?.enableOCR}
              onChange={(e) => handleSettingChange('enableOCR', e?.target?.checked)}
            />

            {scanSettings?.enableOCR && (
              <Select
                label="Langue OCR"
                options={ocrLanguageOptions}
                value={scanSettings?.ocrLanguage}
                onChange={(value) => handleSettingChange('ocrLanguage', value)}
              />
            )}
          </div>
        </div>

        {/* Scan Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-4">
            <Button
              variant="default"
              iconName="Play"
              iconPosition="left"
              iconSize={16}
              onClick={handleStartScan}
              loading={isScanning}
              disabled={!selectedScanner || getScannerOptions()?.length === 0}
            >
              {isScanning ? 'Numérisation...' : 'Démarrer la numérisation'}
            </Button>

            <Button
              variant="outline"
              iconName="Settings"
              iconPosition="left"
              iconSize={16}
            >
              Paramètres avancés
            </Button>
          </div>

          <div className="text-sm text-muted-foreground font-caption">
            {getScannerOptions()?.length} scanner{getScannerOptions()?.length > 1 ? 's' : ''} disponible{getScannerOptions()?.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Preview Pages */}
        {previewPages?.length > 0 && (
          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-body font-medium text-foreground">
                Aperçu des pages numérisées
              </h4>
              <span className="text-sm text-muted-foreground font-caption">
                {previewPages?.length} page{previewPages?.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {previewPages?.map((page) => (
                <div key={page?.id} className="relative group">
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden border border-border">
                    <img
                      src={page?.thumbnail}
                      alt={`Page ${page?.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="destructive"
                      size="sm"
                      iconName="X"
                      onClick={() => handleRemovePage(page?.id)}
                      className="w-6 h-6 p-0"
                    />
                  </div>

                  <div className="mt-2 text-center">
                    <p className="text-xs text-muted-foreground font-caption">
                      Page {page?.id}
                    </p>
                    {scanSettings?.enableOCR && page?.ocrText && (
                      <Icon name="FileText" size={12} className="mx-auto mt-1 text-success" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {previewPages?.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  iconName="Download"
                  iconPosition="left"
                  iconSize={16}
                >
                  Télécharger le document
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerIntegration;