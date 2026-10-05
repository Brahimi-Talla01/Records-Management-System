import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useAuthStore } from '../../features/auth';
import DocumentUpload from './index';

const pdf = (name = 'rapport.pdf') => new File([new Uint8Array([0x25, 0x50])], name);

const fileInput = (container) => container.querySelector('input[type="file"]');

describe('page document-upload (F4)', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('refuse avant envoi un fichier à l’extension non autorisée', async () => {
    // `applyAccept: false` : on teste le refus de l'extension qui n'est pas
    // dans l'attribut `accept` (le navigateur filtrerait sans cette option).
    const user = userEvent.setup({ applyAccept: false });
    const { container } = renderWithProviders(<DocumentUpload />, { route: '/document-upload' });

    await user.upload(fileInput(container), new File([new Uint8Array([1])], 'virus.exe'));

    expect(await screen.findByText(/Extension « .exe » non autorisée/i)).toBeInTheDocument();
  });

  it('dépose un fichier conforme et crée le document', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<DocumentUpload />, { route: '/document-upload' });

    await user.upload(fileInput(container), pdf('Rapport_2025.pdf'));

    // Le formulaire de métadonnées apparaît dès qu'un fichier est en attente.
    const typeSelect = await screen.findByLabelText(/Type de document/i);
    await user.click(typeSelect);
    const dropdown = container.ownerDocument.querySelector('.z-50');
    await user.click(within(dropdown).getByText('Rapport'));

    await user.click(screen.getByRole('button', { name: /Démarrer le dépôt/i }));

    expect(await screen.findByText(/Déposé avec succès/i)).toBeInTheDocument();
  });
});
