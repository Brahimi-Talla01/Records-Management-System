/**
 * Numérisation scanner (F4.6).
 *
 * Le backend n'expose **aucun** endpoint de scanner : plutôt qu'une simulation
 * trompeuse (faux-positif), on affiche un état « non disponible » explicite,
 * piloté par le réglage public `features.scanner_enabled`.
 */
import Icon from '../../../components/AppIcon';
import { EmptyState } from '../../../components/ui/EmptyState';

const ScannerIntegration = ({ scannerEnabled = false }) => {
  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Icon name="ScanLine" size={24} className="text-primary" />
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              Numérisation de documents
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              Acquisition directe depuis un scanner connecté
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {scannerEnabled ? (
          <EmptyState
            icon="ScanLine"
            title="Aucun scanner détecté"
            description="Aucun scanner n'est connecté à cette instance. Déposez vos fichiers numérisés via l'onglet « Téléchargement »."
          />
        ) : (
          <EmptyState
            icon="Ban"
            title="Numérisation non disponible"
            description="L'intégration scanner n'est pas activée sur ce serveur. Numérisez vos documents avec un logiciel externe, puis déposez les fichiers dans l'onglet « Téléchargement »."
          />
        )}
      </div>
    </div>
  );
};

export default ScannerIntegration;
