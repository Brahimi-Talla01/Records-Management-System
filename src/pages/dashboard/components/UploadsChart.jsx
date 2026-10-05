import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import Icon from '../../../components/AppIcon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatFileSize } from '../../../lib/formatters';

/** « 2026-03 » → « mars 26 » (libellé d'axe lisible). */
function monthLabel(month) {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/**
 * Dépôts par mois issus de `GET /dashboard/uploads`.
 * `recharts` est isolé dans le chunk `vendor-charts` (A10) : le socle n'embarque
 * pas la librairie.
 */
const UploadsChart = ({ months = [], isLoading = false }) => {
  const hasData = months.some((item) => item?.count > 0);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="BarChart3" size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-semibold text-foreground">Dépôts par mois</h2>
            <p className="text-sm text-muted-foreground font-body">
              Nombre de documents déposés sur les {months.length || 12} derniers mois
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <EmptyState
            icon="BarChart3"
            title="Aucun dépôt sur la période"
            description="Le graphe se remplira dès le premier document déposé."
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${value} dépôt(s) · ${formatFileSize(item?.payload?.bytes)}`,
                    'Dépôts',
                  ]}
                  labelFormatter={monthLabel}
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-popover-foreground)',
                    fontFamily: 'var(--font-source-sans)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadsChart;
