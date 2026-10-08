/**
 * Recherche avancée (F5).
 *
 * Toute la vue (mots-clés, filtres, facettes, page) vit dans l'URL : une URL
 * copiée rouvre la même recherche, le retour navigateur conserve l'état. La
 * saisie est débouncée (300 ms) avant de toucher l'URL. Aucune donnée serveur
 * en `useState` (M12) — seule la frappe en cours est locale.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Icon from '../../components/AppIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import SearchForm from './components/SearchForm';
import SearchFilters from './components/SearchFilters';
import SearchResults from './components/SearchResults';
import SearchHistory from './components/SearchHistory';
import { useAuth } from '../../features/auth';
import { mapBackendRole } from '../../lib/formatters';
import {
  useSearch,
  parseSearchParams,
  toSearchParams,
  toApiParams,
  hasSearchCriteria,
} from '../../features/search';
import { useDocTypes, useTags, useDepartments } from '../../features/referentials';
import { toAppError } from '../../lib/errors';

const DEBOUNCE_MS = 300;

const AdvancedSearch = () => {
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const view = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const query = useMemo(() => toApiParams(view), [view]);
  const criteria = hasSearchCriteria(view);

  const [keyword, setKeyword] = useState(view.q || '');

  const docTypesQuery = useDocTypes();
  const departmentsQuery = useDepartments();
  const tagsQuery = useTags();

  const resultsQuery = useSearch(query, { enabled: criteria });

  // L'URL est la source de vérité : si elle change ailleurs (retour, historique,
  // lien partagé), on resynchronise la frappe locale.
  useEffect(() => {
    setKeyword(view.q || '');
  }, [view.q]);

  // Débounce de la saisie (F5.1) avant de pousser le paramètre `q`.
  useEffect(() => {
    if (keyword === (view.q || '')) return undefined;
    const timer = setTimeout(() => {
      setSearchParams(toSearchParams({ ...view, q: keyword || null, page: 1 }), {
        replace: true,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `view` est recréé à chaque changement d'URL : on ne dépend que de la frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const patchView = (patch, { replace = false } = {}) => {
    setSearchParams(toSearchParams({ ...view, ...patch }), { replace });
  };

  const handleClear = () => {
    setKeyword('');
    setSearchParams(new URLSearchParams());
  };

  const handleReuse = (entry) => {
    const filters = entry?.filters || {};
    patchView({
      q: entry?.query || null,
      status: filters.status ?? null,
      department_id: filters.department_id ?? null,
      doc_type_id: filters.doc_type_id ?? null,
      confidentiality: filters.confidentiality ?? null,
      date_from: filters.created_from ?? null,
      date_to: filters.created_to ?? null,
      tag_ids: filters.tag_ids || [],
      page: 1,
    });
  };

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // session déjà morte
    } finally {
      navigate('/login');
    }
  };

  const headerUser = me
    ? { name: me.full_name || me.username, role: mapBackendRole(me.role?.name), email: me.email }
    : null;

  const data = resultsQuery.data;
  const items = data?.items || [];
  const appError = resultsQuery.error ? toAppError(resultsQuery.error) : null;
  const isPaused = appError?.code === 'too_many_requests';

  return (
    <div className="min-h-screen bg-background">
      <Header user={headerUser} onLogout={handleLogout} />
      <main id="main-content" tabIndex={-1} className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground">Recherche avancée</h1>
            <p className="text-muted-foreground font-body mt-2">
              Trouvez rapidement les documents dont vous avez besoin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Colonne latérale : formulaire + historique */}
            <div className="lg:col-span-1 space-y-6">
              <SearchForm
                state={view}
                keyword={keyword}
                onKeywordChange={setKeyword}
                onPatch={patchView}
                onClear={handleClear}
                docTypes={docTypesQuery.data || []}
                departments={departmentsQuery.data || []}
                tags={tagsQuery.data || []}
                isLoading={resultsQuery.isFetching}
              />
              <SearchHistory onReuse={handleReuse} />
            </div>

            {/* Zone principale : résultats + facettes */}
            <div className="lg:col-span-3">
              {!criteria ? (
                <div className="bg-card border border-border rounded-lg shadow-card p-12">
                  <div className="text-center">
                    <Icon
                      name="Search"
                      size={64}
                      className="text-muted-foreground mx-auto mb-6"
                    />
                    <h2 className="text-2xl font-heading font-semibold text-foreground mb-4">
                      Commencez votre recherche
                    </h2>
                    <p className="text-muted-foreground font-body mb-8 max-w-md mx-auto">
                      Saisissez des mots-clés ou choisissez des filtres pour interroger la base
                      documentaire.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/document-upload')}
                      className="text-primary font-body hover:underline"
                    >
                      Déposer un document
                    </button>
                  </div>
                </div>
              ) : appError && !isPaused ? (
                <div className="bg-card border border-border rounded-lg shadow-card">
                  <EmptyState
                    icon="AlertTriangle"
                    title="Recherche impossible"
                    description={appError.message}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                  <div className="xl:col-span-3">
                    <SearchResults
                      items={items}
                      total={data?.total || 0}
                      page={data?.page || view.page || 1}
                      pages={data?.pages || 1}
                      tookMs={data?.took_ms}
                      engine={data?.engine}
                      isLoading={resultsQuery.isLoading}
                      isPaused={isPaused}
                      pauseMessage={appError?.message}
                      docTypes={docTypesQuery.data || []}
                      departments={departmentsQuery.data || []}
                      onOpen={(document) => navigate(`/document-library/${document.document_id}`)}
                      onPageChange={(page) => patchView({ page })}
                    />
                  </div>
                  <div className="xl:col-span-1">
                    <div className="sticky top-24">
                      <SearchFilters
                        facets={data?.facets || {}}
                        state={view}
                        onPatch={patchView}
                        onClear={handleClear}
                        resultCount={data?.total || 0}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdvancedSearch;
