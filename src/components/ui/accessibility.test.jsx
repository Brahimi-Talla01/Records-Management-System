import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Modal from './Modal';
import SkipLink from './SkipLink';
import { expectNoA11yViolations } from '../../test/a11y';

const ModalHarness = ({ onClose }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <Modal
        isOpen={open}
        title="Confirmer la suppression"
        onClose={() => {
          setOpen(false);
          onClose?.();
        }}
        footer={<Button>Valider</Button>}
      >
        <p>Texte de contenu.</p>
      </Modal>
    </>
  );
};

describe('a11y — primitives (vitest-axe)', () => {
  it('Button sans violation', async () => {
    const { container } = render(<Button>Enregistrer</Button>);
    await expectNoA11yViolations(container);
  });

  it('Button icône avec aria-label sans violation', async () => {
    const { container } = render(
      <Button iconName="X" aria-label="Fermer la fenêtre" />
    );
    await expectNoA11yViolations(container);
  });

  it('Input : erreur annoncée et reliée au champ (aria-invalid + aria-describedby)', async () => {
    const { container } = render(
      <Input label="Matricule" error="Champ obligatoire" />
    );
    const input = screen.getByLabelText('Matricule');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy)).toHaveTextContent('Champ obligatoire');
    await expectNoA11yViolations(container);
  });

  it('Select fermé sans violation', async () => {
    const { container } = render(
      <Select
        label="Département"
        value=""
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
    await expectNoA11yViolations(container);
  });

  it('Select : flèches + Entrée sélectionnent une option (clavier)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select
        label="Département"
        value=""
        onChange={onChange}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}'); // ouvre
    await user.keyboard('{ArrowDown}'); // sur « Beta »
    await user.keyboard('{Enter}'); // sélectionne
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Select ouvert : listbox accessible, sans violation', async () => {
    const user = userEvent.setup();
    const { container, baseElement } = render(
      <Select
        label="Département"
        value=""
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await expectNoA11yViolations(baseElement || container);
  });

  it('Modal : dialogue nommé, focus piégé, Échap ferme et restaure le focus', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(<ModalHarness onClose={() => { closed = true; }} />);

    const trigger = screen.getByRole('button', { name: 'Ouvrir' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Confirmer la suppression');
    await expectNoA11yViolations(dialog);

    await user.keyboard('{Escape}');
    expect(closed).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Le focus revient à l'élément déclencheur.
    expect(trigger).toHaveFocus();
  });

  it('SkipLink : pointe vers le contenu principal', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'Aller au contenu principal' })).toHaveAttribute(
      'href',
      '#main-content'
    );
  });
});
