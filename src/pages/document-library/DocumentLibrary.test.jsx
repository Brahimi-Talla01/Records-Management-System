import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '../../features/auth';
import { demoDocuments } from '../../mocks/handlers';
import DocumentLibrary from './index';

describe('page document-library', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('affiche les documents renvoyés par l’API', async () => {
    renderWithProviders(<DocumentLibrary />, { route: '/document-library' });

    expect(
      await screen.findByRole('heading', { name: /Bibliothèque de documents/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(demoDocuments[0].title)).toBeInTheDocument();
  });

  it('reflète l’état de l’URL : la vue corbeille est pilotée par ?status', async () => {
    renderWithProviders(<DocumentLibrary />, { route: '/document-library?status=deleted' });

    expect(await screen.findByText(/Documents de la corbeille/i)).toBeInTheDocument();
  });
});
