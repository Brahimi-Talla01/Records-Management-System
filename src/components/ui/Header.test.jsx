import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import Header from './Header';
import { useAuthStore } from '../../features/auth';
import { demoUser } from '../../mocks/handlers';

describe('Header — espace Administration', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    // `demoUser` porte le rôle Admin : l'entrée Administration est visible.
    useAuthStore.getState().setUser(demoUser);
  });

  it('garde un texte clair (token primary-foreground) sur une page admin', () => {
    renderWithProviders(<Header user={{ name: 'Admin Démo', role: 'admin' }} />, {
      route: '/user-management',
    });

    const button = screen.getByRole('button', { name: /Administration/i });
    expect(button.className).toContain('text-primary-foreground');
    expect(button.className).not.toMatch(/\btext-foreground\b/);
  });

  it('reste en texte sombre (token foreground) hors page admin', () => {
    renderWithProviders(<Header user={{ name: 'Admin Démo', role: 'admin' }} />, {
      route: '/dashboard',
    });

    const button = screen.getByRole('button', { name: /Administration/i });
    expect(button.className).toMatch(/\btext-foreground\b/);
    expect(button.className).not.toContain('text-primary-foreground');
  });
});
