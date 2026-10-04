import { describe, it, expect } from 'vitest';
import {
  mapBackendRole,
  getRoleLabel,
  formatFileSize,
  getDocumentStatusMeta,
  getConfidentialityMeta,
  formatRelativeTime,
  describeUserAgent,
  getAlertSeverityMeta,
  getAlertTypeLabel,
} from './formatters';

describe('mapBackendRole', () => {
  it('normalise les rôles backend vers les clés UI', () => {
    expect(mapBackendRole('Admin')).toBe('admin');
    expect(mapBackendRole('Prof')).toBe('teacher');
    expect(mapBackendRole('Etudiant')).toBe('student');
    expect(mapBackendRole('Secretaire')).toBe('staff');
  });

  it('tolère une valeur absente', () => {
    expect(mapBackendRole(undefined)).toBe('');
  });
});

describe('getRoleLabel', () => {
  it('retombe sur Utilisateur pour un rôle inconnu', () => {
    expect(getRoleLabel('inconnu')).toBe('Utilisateur');
    expect(getRoleLabel('admin')).toBe('Administrateur');
  });
});

describe('formatFileSize', () => {
  it('formate en ko et Mo', () => {
    expect(formatFileSize(1024)).toBe('1.0 ko');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 Mo');
  });

  it('gère les valeurs invalides', () => {
    expect(formatFileSize(0)).toBe('—');
    expect(formatFileSize('nope')).toBe('—');
  });
});

describe('métadonnées', () => {
  it('associe statut et variante de badge', () => {
    expect(getDocumentStatusMeta('active')).toEqual({ label: 'Actif', variant: 'success' });
    expect(getDocumentStatusMeta('inconnu').variant).toBe('neutral');
  });

  it('associe confidentialité et variante', () => {
    expect(getConfidentialityMeta('secret').variant).toBe('error');
    expect(getConfidentialityMeta('public').variant).toBe('info');
  });
});

describe('formatRelativeTime', () => {
  it('exprime l’écart en minutes puis en heures', () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000))).toBe('Il y a 5 min');
    expect(formatRelativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe('Il y a 3 h');
  });

  it('gère une date invalide', () => {
    expect(formatRelativeTime('pas-une-date')).toBe('—');
  });
});

describe('describeUserAgent', () => {
  it('résume navigateur et système', () => {
    expect(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0')).toBe('Chrome sur Linux');
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0) Firefox/121.0')).toBe('Firefox sur Windows');
  });

  it('retombe sur un libellé neutre', () => {
    expect(describeUserAgent(null)).toBe('Appareil inconnu');
  });
});

describe('alertes de sécurité', () => {
  it('traduit la sévérité en variante de badge', () => {
    expect(getAlertSeverityMeta('high').variant).toBe('error');
    expect(getAlertSeverityMeta('medium').variant).toBe('warning');
    expect(getAlertSeverityMeta(undefined).variant).toBe('neutral');
  });

  it('traduit le type technique en libellé', () => {
    expect(getAlertTypeLabel('multiple_login_attempts')).toBe('Tentatives de connexion multiples');
    expect(getAlertTypeLabel(undefined)).toBe('Alerte de sécurité');
  });
});
