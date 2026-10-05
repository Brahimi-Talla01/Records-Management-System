/**
 * Hooks du domaine Réglages (TanStack Query).
 * `usePublicSettings` alimente les écrans de dépôt (F4, valeurs de repli) ;
 * les hooks `useSetting*` alimentent l'éditeur d'administration (F6).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/** Définitions typées des réglages (éditeur). */
export function useSettingsSchema() {
  return useQuery({
    queryKey: settingsKeys.schema,
    queryFn: () => settingsApi.schema(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Valeurs effectives pour un campus (ou global si `campusId` absent). */
export function useSettingsValues(campusId) {
  return useQuery({
    queryKey: settingsKeys.values(campusId),
    queryFn: () => settingsApi.values({ campusId }),
    staleTime: 30 * 1000,
  });
}

export function useSettingsDefaults() {
  return useQuery({
    queryKey: settingsKeys.defaults,
    queryFn: () => settingsApi.defaults(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Enregistre un lot de réglages (PUT /settings). */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items) => settingsApi.update(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
