import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { RequireAuth, RequireRole, RequireScope } from './guards';
import { useAuthStore } from '../authStore';

const Guest = () => <div>Page invitée</div>;

function renderGuarded(route, element) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<Guest />} />
      <Route path="/forbidden" element={<div>Accès refusé</div>} />
      <Route path={route} element={element} />
    </Routes>,
    { route }
  );
}

describe('gardes de route', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('RequireAuth redirige un visiteur vers /login', async () => {
    renderGuarded(
      '/secret',
      <RequireAuth>
        <div>Contenu protégé</div>
      </RequireAuth>
    );
    await waitFor(() => expect(screen.getByText('Page invitée')).toBeInTheDocument());
  });

  it('RequireRole redirige un rôle non autorisé vers /forbidden', async () => {
    useAuthStore.getState().setUser({
      username: 'etu',
      role: { name: 'Etudiant' },
      campus_id: 1,
    });
    renderGuarded(
      '/admin',
      <RequireRole roles={['Admin']}>
        <div>Administration</div>
      </RequireRole>
    );
    await waitFor(() => expect(screen.getByText('Accès refusé')).toBeInTheDocument());
  });

  it('RequireScope refuse un Admin rattaché à un campus', async () => {
    useAuthStore.getState().setUser({
      username: 'admin.campus',
      role: { name: 'Admin' },
      campus_id: 3,
    });
    renderGuarded(
      '/super',
      <RequireScope>
        <div>Réglages globaux</div>
      </RequireScope>
    );
    await waitFor(() => expect(screen.getByText('Accès refusé')).toBeInTheDocument());
  });
});
