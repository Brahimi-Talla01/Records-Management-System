import { describe, it, expect, vi } from 'vitest';
import { buildUsersCsvTemplate, downloadUsersCsvTemplate } from './csvTemplate';

describe("modèle CSV d'import des utilisateurs (F6.5)", () => {
  it("reprend l'en-tête exact attendu par le serveur", () => {
    const [header] = buildUsersCsvTemplate().split('\r\n');
    expect(header).toBe(
      'matricule,username,email,full_name,role_id,department_id,is_active'
    );
  });

  it("propose une ligne d'exemple avec les identifiants fournis", () => {
    const csv = buildUsersCsvTemplate({
      roles: [{ role_id: 3 }],
      departments: [{ department_id: 2 }],
    });
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(2);
    const cells = lines[1].split(',');
    expect(cells[0]).toBe('ETU2026-001');
    expect(cells[4]).toBe('3');
    expect(cells[5]).toBe('2');
  });

  it('laisse les identifiants vides quand les référentiels manquent', () => {
    const cells = buildUsersCsvTemplate().split('\r\n')[1].split(',');
    expect(cells[4]).toBe('');
    expect(cells[5]).toBe('');
  });

  it('télécharge le fichier via un lien Blob', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const name = downloadUsersCsvTemplate({});

    expect(name).toBe('modele_import_utilisateurs.csv');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();

    click.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
