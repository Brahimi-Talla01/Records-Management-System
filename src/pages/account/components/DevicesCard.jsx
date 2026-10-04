import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Icon from '../../../components/AppIcon';
import {
  useSessions,
  useRevokeSession,
  useRevokeAllSessions,
} from '../../../features/auth';
import { useToast } from '../../../components/ui/useToast';
import { useConfirm } from '../../../components/ui/useConfirm';
import { toAppError } from '../../../lib/errors';
import { describeUserAgent, formatRelativeTime } from '../../../lib/formatters';

/**
 * « Mes appareils » : sessions actives du compte.
 * Révocation unitaire ou globale (`DELETE /auth/sessions` → déconnexion partout).
 */
const DevicesCard = () => {
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAll = useRevokeAllSessions();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const sessions = sessionsQuery.data || [];

  const handleRevoke = async (session) => {
    const ok = await confirm({
      title: 'Révoquer la session',
      description: `Déconnecter « ${describeUserAgent(session.user_agent)} » ?`,
      confirmLabel: 'Révoquer',
    });
    if (!ok) return;
    revokeSession.mutate(session.session_id, {
      onSuccess: () => toast.success('Session révoquée.'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  const handleRevokeAll = async () => {
    const ok = await confirm({
      title: 'Déconnexion de tous les appareils',
      description:
        'Toutes vos sessions seront révoquées, y compris celle-ci. Vous devrez vous reconnecter.',
      confirmLabel: 'Tout déconnecter',
    });
    if (!ok) return;
    revokeAll.mutate(undefined, {
      onSuccess: () => navigate('/login'),
      onError: (err) => toast.error(toAppError(err).message),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon name="Server" size={18} className="text-primary" />
          <CardTitle>Mes appareils</CardTitle>
        </div>
        {sessions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            iconName="LogOut"
            iconPosition="left"
            onClick={handleRevokeAll}
            loading={revokeAll.isPending}
          >
            Tout déconnecter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sessionsQuery.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {!sessionsQuery.isLoading && sessions.length === 0 && (
          <EmptyState
            icon="Server"
            title="Aucune autre session"
            description="Les appareils connectés à votre compte apparaîtront ici."
          />
        )}

        {sessions.length > 0 && (
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li
                key={session.session_id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon name="Globe" size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-foreground">
                      {describeUserAgent(session.user_agent)}
                    </p>
                    <p className="text-xs font-caption text-muted-foreground">
                      IP&nbsp;: <span className="font-data">{session.ip || '—'}</span>
                      {session.last_seen ? ` · activité ${formatRelativeTime(session.last_seen)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge variant="neutral">
                    {session.created_at
                      ? `Ouverte ${formatRelativeTime(session.created_at)}`
                      : 'Session'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="X"
                    iconPosition="left"
                    onClick={() => handleRevoke(session)}
                    loading={revokeSession.isPending && revokeSession.variables === session.session_id}
                  >
                    Révoquer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default DevicesCard;
