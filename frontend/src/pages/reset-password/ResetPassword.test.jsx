import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import ResetPassword from './index';

describe('page reset-password', () => {
  it('affiche un message d’erreur sans jeton', () => {
    renderWithProviders(<ResetPassword />, { route: '/reset-password' });
    expect(screen.getByText(/Lien invalide/i)).toBeInTheDocument();
  });

  it('refuse un mot de passe trop faible avant l’appel API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPassword />, { route: '/reset-password?token=jeton' });

    await user.type(screen.getByLabelText(/Nouveau mot de passe/i), 'court');
    await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'court');
    await user.click(screen.getByRole('button', { name: /Réinitialiser/i }));

    expect(await screen.findByText(/Au moins 8 caractères/i)).toBeInTheDocument();
  });
});
