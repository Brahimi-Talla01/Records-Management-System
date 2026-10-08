import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '../../features/auth';
import { demoDocuments } from '../../mocks/handlers';
import DocumentDetail from './index';

const renderDetail = (route = '/document-library/1') =>
  renderWithProviders(
    <Routes>
      <Route path="/document-library/:documentId" element={<DocumentDetail />} />
    </Routes>,
    { route }
  );

describe('page document-detail', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('charge la fiche, les versions et les droits effectifs', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: demoDocuments[0].title })
    ).toBeInTheDocument();
    // Historique des versions renvoyé par GET /documents/<id>/versions.
    expect(await screen.findByText(/Version 2/)).toBeInTheDocument();
    expect(screen.getByText(/Version 1/)).toBeInTheDocument();
  });

  it('active les actions selon les permissions servies par l’API', async () => {
    renderDetail();

    const rights = (await screen.findByRole('heading', { name: /Vos droits/i })).parentElement;
    const section = rights?.closest('section');
    expect(section).not.toBeNull();

    // demoPermissions : view/download autorisés, edit/delete refusés.
    expect(within(section).getByText('Supprimer').nextElementSibling).toHaveTextContent('Refusé');
    expect(within(section).getAllByText('Autorisé').length).toBeGreaterThan(0);

    // edit refusé → pas de formulaire d'étiquette, mention lecture seule.
    expect(await screen.findByText(/Lecture seule/i)).toBeInTheDocument();
  });
});
