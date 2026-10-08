import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../test/renderWithProviders';
import Help from './index';

/** Sonde d'URL : MemoryRouter ne l'expose pas directement. */
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

describe("centre d'aide (page /help)", () => {
  it('rend le guide de démarrage et les tutoriels', () => {
    renderWithProviders(<Help />, { route: '/help' });

    expect(screen.getByRole('heading', { name: "Centre d'aide" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Guide de démarrage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tutoriels' })).toBeInTheDocument();
    expect(screen.getByText('Déposer un document')).toBeInTheDocument();
    expect(screen.getByText('Déposer et indexer un document')).toBeInTheDocument();
  });

  it('affiche les coordonnées de support depuis l’API institution', async () => {
    renderWithProviders(<Help />, { route: '/help' });

    expect(screen.getByRole('heading', { name: 'Contacter le support' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'contact@demo.local' })).toHaveAttribute(
      'href',
      'mailto:contact@demo.local'
    );
  });

  it('filtre le guide et les tutoriels (insensible aux accents)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Help />, { route: '/help' });

    await user.type(screen.getByLabelText("Rechercher dans le centre d'aide"), 'bibliotheque');

    expect(screen.getByText('Parcourir la bibliothèque')).toBeInTheDocument();
    expect(screen.queryByText('Déposer et indexer un document')).not.toBeInTheDocument();
    expect(screen.getByText(/résultat/)).toBeInTheDocument();
  });

  it('affiche un état vide quand la recherche ne correspond à rien', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Help />, { route: '/help' });

    await user.type(screen.getByLabelText("Rechercher dans le centre d'aide"), 'zzzz');

    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
  });

  it('un tutoriel mène à l’écran concerné', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Help />
        <LocationProbe />
      </>,
      { route: '/help' }
    );

    await user.click(
      screen.getByRole('button', {
        name: /Ouvrir le tutoriel « Déposer et indexer un document »/,
      })
    );

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/document-upload')
    );
  });
});
