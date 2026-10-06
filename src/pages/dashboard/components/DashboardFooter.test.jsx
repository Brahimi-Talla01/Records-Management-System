import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import DashboardFooter from './DashboardFooter';

describe('pied de page du tableau de bord', () => {
  it('ouvre la politique de confidentialité', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardFooter />);

    await user.click(screen.getByRole('button', { name: /Politique de confidentialité/i }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Politique de confidentialité');
    expect(screen.getByText('Données traitées')).toBeInTheDocument();
  });

  it("ouvre les conditions d'utilisation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardFooter />);

    await user.click(screen.getByRole('button', { name: /Conditions d'utilisation/i }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName("Conditions d'utilisation");
    expect(screen.getByText('Usage acceptable')).toBeInTheDocument();
  });
});
