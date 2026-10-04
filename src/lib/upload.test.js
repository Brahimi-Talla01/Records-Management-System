import { describe, it, expect } from 'vitest';
import { fileExtension, fileBaseName, validateFile, progressPercent } from './upload';

const makeFile = (name) => new File([new Uint8Array(1)], name);

const sizedFile = (name, size) => {
  const file = new File([new Uint8Array(1)], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('lib/upload (F4)', () => {
  it('extrait une extension normalisée', () => {
    expect(fileExtension('Rapport.PDF')).toBe('pdf');
    expect(fileExtension('archive.tar.gz')).toBe('gz');
    expect(fileExtension('sans-extension')).toBe('');
    expect(fileExtension('.env')).toBe('');
  });

  it('dérive un titre sans extension', () => {
    expect(fileBaseName('rapport_annuel.pdf')).toBe('rapport_annuel');
    expect(fileBaseName('these')).toBe('these');
    expect(fileBaseName('.env')).toBe('.env');
  });

  it('refuse une extension non autorisée', () => {
    const result = validateFile(makeFile('virus.exe'), { allowedExtensions: ['pdf'] });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('extension_not_allowed');
  });

  it('refuse un fichier sans extension', () => {
    expect(validateFile(makeFile('fichier'), { allowedExtensions: ['pdf'] }).code).toBe(
      'missing_extension'
    );
  });

  it('refuse un fichier trop volumineux', () => {
    const file = sizedFile('gros.pdf', 60 * 1024 * 1024);
    const result = validateFile(file, { allowedExtensions: ['pdf'], maxSizeMb: 50 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('file_too_large');
  });

  it('accepte un fichier conforme', () => {
    expect(validateFile(makeFile('ok.pdf'), { allowedExtensions: ['pdf'], maxSizeMb: 50 }).ok).toBe(
      true
    );
  });

  it('calcule un pourcentage de progression borné', () => {
    expect(progressPercent({ loaded: 50, total: 100 })).toBe(50);
    expect(progressPercent({ loaded: 0, total: 0 })).toBe(0);
    expect(progressPercent({ loaded: 200, total: 100 })).toBe(100);
  });
});
