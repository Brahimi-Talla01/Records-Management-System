import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '../../features/auth';
import AdvancedSearch from './index';

/** Sonde d'URL : MemoryRouter ne l'expose pas directement. */
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

describe('page advanced-search (F5)', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('rend l’extrait surligné via de vrais <mark> (aucun innerHTML)', async () => {
    renderWithProviders(<AdvancedSearch />, { route: '/advanced-search?q=rapport' });

    const highlight = await screen.findByText('rapport', { selector: 'mark' });
    expect(highlight.tagName).toBe('MARK');
    expect(await screen.findByText('Rapport annuel 2025')).toBeInTheDocument();
  });

  it('une URL copiée rouvre la vue et une facette filtre sans perdre les mots-clés', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <AdvancedSearch />
        <LocationProbe />
      </>,
      { route: '/advanced-search?q=rapport' }
    );

    await screen.findByText('Rapport annuel 2025');
    await user.click(await screen.findByRole('button', { name: /Informatique/i }));

    await waitFor(() =>
      expect(screen.getByTestId('location-search').textContent).toContain('department_id=1')
    );
    expect(screen.getByTestId('location-search').textContent).toContain('q=rapport');
  });
});
