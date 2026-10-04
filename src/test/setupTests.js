import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';

// MSW : aucune requête réelle ne doit sortir des tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// Polyfills jsdom utilisés par les composants (dialogues, aperçu fichiers).
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:test';
  window.URL.revokeObjectURL = () => {};
}
