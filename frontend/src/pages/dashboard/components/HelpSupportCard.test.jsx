import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import HelpSupportCard from './HelpSupportCard';

describe('Aide & Support (tableau de bord)', () => {
  it("ouvre le guide d'utilisation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpSupportCard />);

    await user.click(screen.getByRole('button', { name: /Guide d'utilisation/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName("Guide d'utilisation");
    expect(screen.getByText('Déposer un document')).toBeInTheDocument();
  });

  it('affiche les coordonnées de support depuis l’API institution', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpSupportCard />);

    await user.click(screen.getByRole('button', { name: /Contacter le support/i }));

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Contacter le support');
    expect(await screen.findByRole('link', { name: 'contact@demo.local' })).toHaveAttribute(
      'href',
      'mailto:contact@demo.local'
    );
    expect(screen.getByRole('link', { name: /Écrire au support/i })).toHaveAttribute(
      'href',
      'mailto:contact@demo.local'
    );
  });

  it('propose des tutoriels qui pointent vers les écrans concernés', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpSupportCard />);

    await user.click(screen.getByRole('button', { name: /Tutoriels vidéo/i }));

    expect(
      screen.getByRole('button', { name: /Ouvrir le tutoriel « Déposer et indexer un document »/ })
    ).toBeInTheDocument();
  });
});
