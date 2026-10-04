/**
 * Réglages & institution (F6.3).
 *
 * Éditeur piloté par `GET /settings/schema` (type, portée, aide) : les valeurs
 * effectives viennent de `GET /settings` (campus sélectionné), les défauts de
 * `GET /settings/defaults`, et l'enregistrement passe par `PUT /settings` en
 * lot. L'onglet Institution édite `GET/PUT /institution`.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Icon from '../../components/AppIcon';
import CampusScopeBar from '../../components/ui/CampusScopeBar';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/useToast';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';
import {
  useSettingsSchema,
  useSettingsValues,
  useSettingsDefaults,
  useUpdateSettings,
  usePublicSettings,
} from '../../features/settings';
import { useCampusScope, useInstitution, useUpdateInstitution } from '../../features/campuses';
import { toAppError } from '../../lib/errors';

const TABS = [
  { id: 'settings', label: 'Réglages', icon: 'Settings' },
  { id: 'institution', label: 'Institution', icon: 'Building2' },
];

const SettingsField = ({ definition, value, onChange }) => {
  const { type, choices = [] } = definition;
  if (type === 'bool') {
    return (
      <Checkbox
        label={definition.label || definition.key}
        description={definition.help}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }
  if (type === 'choice') {
    return (
      <Select
        label={definition.label || definition.key}
        description={definition.help}
        options={choices.map((choice) => ({ value: choice, label: choice }))}
        value={value ?? ''}
        onChange={onChange}
      />
    );
  }
  if (type === 'list') {
    return (
      <Input
        label={definition.label || definition.key}
        description={definition.help}
        value={Array.isArray(value) ? value.join(', ') : ''}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          )
        }
      />
    );
  }
  return (
    <Input
      label={definition.label || definition.key}
      description={definition.help}
      type={type === 'int' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(event) => onChange(type === 'int' ? Number(event.target.value) : event.target.value)}
    />
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: me, logout } = useAuth();
  const { canSelect, campusId, setCampusId, campuses, scopeName } = useCampusScope();

  const [activeTab, setActiveTab] = useState('settings');
  const [draft, setDraft] = useState({});

  const schemaQuery = useSettingsSchema();
  const valuesQuery = useSettingsValues(campusId);
  const defaultsQuery = useSettingsDefaults();
  const updateSettings = useUpdateSettings();
  const publicSettings = usePublicSettings();

  const institutionQuery = useInstitution();
  const updateInstitution = useUpdateInstitution();
  const [institution, setInstitution] = useState(null);

  useEffect(() => {
    if (institutionQuery.data) setInstitution(institutionQuery.data);
  }, [institutionQuery.data]);

  const values = valuesQuery.data?.settings || {};

  const grouped = useMemo(() => {
    const definitions = schemaQuery.data?.settings || [];
    const byCategory = new Map();
    for (const definition of definitions) {
      const key = definition.category || 'general';
      if (!byCategory.has(key)) {
        byCategory.set(key, { label: definition.category_label || key, items: [] });
      }
      byCategory.get(key).items.push(definition);
    }
    return [...byCategory.values()];
  }, [schemaQuery.data]);

  const currentValue = (definition) =>
    definition.key in draft ? draft[definition.key] : values[definition.key];

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte
    } finally {
      navigate('/login');
    }
  };

  const handleSaveSettings = async () => {
    const items = Object.entries(draft).map(([key, value]) => ({
      key,
      value,
      scope: campusId ? 'campus' : 'global',
      ...(campusId ? { campus_id: campusId } : {}),
    }));
    if (items.length === 0) {
      toast.warning('Aucune modification à enregistrer.');
      return;
    }
    try {
      await updateSettings.mutateAsync(items);
      setDraft({});
      toast.success('Réglages enregistrés.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  const handleResetDraft = () => setDraft({});

  const handleSaveInstitution = async () => {
    if (!institution) return;
    try {
      await updateInstitution.mutateAsync(institution);
      toast.success('Institution mise à jour.');
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />
          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold text-foreground">Administration</h1>
            <p className="font-body text-muted-foreground mt-2">
              Réglages globaux et de campus, profil de l'établissement.
            </p>
          </div>

          <CampusScopeBar
            campuses={campuses}
            campusId={campusId}
            onCampusChange={setCampusId}
            canSelect={canSelect}
            scopeName={scopeName}
          />

          <div className="mb-6 border-b border-border">
            <nav className="flex space-x-8">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-body font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'settings' ? (
            <div className="space-y-6">
              {schemaQuery.isLoading || valuesQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                grouped.map((group) => (
                  <section
                    key={group.label}
                    className="bg-card border border-border rounded-lg shadow-card p-6"
                  >
                    <h2 className="mb-4 font-heading font-semibold text-foreground">{group.label}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {group.items.map((definition) => (
                        <SettingsField
                          key={definition.key}
                          definition={definition}
                          value={currentValue(definition)}
                          onChange={(value) => setDraft((prev) => ({ ...prev, [definition.key]: value }))}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-caption text-xs text-muted-foreground">
                  Aperçu public : {publicSettings.data ? 'chargé' : '—'} · défauts du registre :{' '}
                  {defaultsQuery.data ? 'chargé' : '—'}
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" iconName="RotateCcw" onClick={handleResetDraft}>
                    Annuler
                  </Button>
                  <Button
                    variant="default"
                    iconName="Save"
                    iconPosition="left"
                    loading={updateSettings.isPending}
                    onClick={handleSaveSettings}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <section className="bg-card border border-border rounded-lg shadow-card p-6 space-y-6">
              {institutionQuery.isLoading || !institution ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Input
                      label="Nom de l'établissement"
                      value={institution.name || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <Input
                      label="Nom court"
                      value={institution.short_name || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, short_name: event.target.value }))
                      }
                    />
                    <Input
                      label="Slogan"
                      value={institution.slogan || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, slogan: event.target.value }))
                      }
                    />
                    <Input
                      label="Site web"
                      value={institution.website || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, website: event.target.value }))
                      }
                    />
                    <Input
                      label="Email"
                      value={institution.email || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                    <Input
                      label="Téléphone"
                      value={institution.phone || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                    <Input
                      label="Adresse"
                      value={institution.address || ''}
                      onChange={(event) =>
                        setInstitution((prev) => ({ ...prev, address: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      iconName="Save"
                      iconPosition="left"
                      loading={updateInstitution.isPending}
                      onClick={handleSaveInstitution}
                    >
                      Enregistrer
                    </Button>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;
