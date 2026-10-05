import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePublicSettings, UPLOAD_DEFAULTS } from './useSettings';
import { createTestQueryClient } from '../../test/renderWithProviders';

function wrapper(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('usePublicSettings (F4)', () => {
  it('lit les limites de dépôt depuis GET /settings/public', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => usePublicSettings(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.upload.maxUploadMb).toBe(50);
    expect(result.current.upload.allowedExtensions).toContain('pdf');
    expect(result.current.upload.ocrEnabled).toBe(false);
    expect(result.current.upload.scannerEnabled).toBe(false);
  });

  it('retombe sur les défauts si le serveur ne renvoie aucun réglage', async () => {
    const { server } = await import('../../mocks/server');
    const { http, HttpResponse } = await import('msw');
    server.use(http.get('*/api/settings/public', () => HttpResponse.json({})));

    const client = createTestQueryClient();
    const { result } = renderHook(() => usePublicSettings(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.upload.maxUploadMb).toBe(UPLOAD_DEFAULTS.maxUploadMb);
  });
});
