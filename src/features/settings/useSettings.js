/**
 * Hooks du domaine Réglages (TanStack Query).
 * `usePublicSettings` alimente les écrans de dépôt (F4) en réglages serveur,
 * avec des valeurs de repli si l'endpoint public est indisponible.
 */
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from './api';
import { settingsKeys } from '../../lib/queryKeys';

/** Valeurs de repli (miroir des défauts du registre backend). */
export const UPLOAD_DEFAULTS = {
  maxUploadMb: 50,
  allowedExtensions: ['pdf', 'doc', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'],
  ocrEnabled: false,
  scannerEnabled: false,
};

export function usePublicSettings() {
  const query = useQuery({
    queryKey: settingsKeys.public,
    queryFn: () => settingsApi.public(),
    staleTime: 5 * 60 * 1000,
  });

  const s = query.data?.settings || {};
  const upload = {
    maxUploadMb: s['storage.max_upload_mb'] ?? UPLOAD_DEFAULTS.maxUploadMb,
    allowedExtensions: s['storage.allowed_extensions'] ?? UPLOAD_DEFAULTS.allowedExtensions,
    ocrEnabled: s['features.ocr_enabled'] ?? UPLOAD_DEFAULTS.ocrEnabled,
    scannerEnabled: s['features.scanner_enabled'] ?? UPLOAD_DEFAULTS.scannerEnabled,
  };

  return { ...query, upload };
}
