import Card, { CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/AppIcon';
import { mapBackendRole, getRoleLabel, formatDate, formatDateTime } from '../../../lib/formatters';

/** Ligne « libellé / valeur » uniforme du bloc profil. */
const InfoItem = ({ icon, label, children }) => (
  <div className="flex items-start gap-3">
    <Icon name={icon} size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs font-caption uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-body text-foreground">{children ?? '—'}</div>
    </div>
  </div>
);

/**
 * Profil en lecture seule, alimenté par la session (`GET /auth/me`).
 * Aucune donnée n'est éditable ici : les modifications de compte passe par
 * l'administration.
 */
const ProfileCard = ({ user }) => {
  const roleKey = mapBackendRole(user?.role?.name);
  const isActive = user?.is_active !== false;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Icon name="User" size={18} className="text-primary" />
          <CardTitle>Profil</CardTitle>
        </div>
        <Badge variant={isActive ? 'success' : 'error'}>
          {isActive ? 'Compte actif' : 'Compte désactivé'}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem icon="User" label="Nom complet">
          {user?.full_name || user?.username}
        </InfoItem>
        <InfoItem icon="Key" label="Identifiant">
          <span className="font-data">{user?.username}</span>
        </InfoItem>
        <InfoItem icon="Award" label="Matricule">
          <span className="font-data">{user?.matricule || '—'}</span>
        </InfoItem>
        <InfoItem icon="Send" label="Email">
          {user?.email || '—'}
        </InfoItem>
        <InfoItem icon="Shield" label="Rôle">
          <Badge variant="primary">{getRoleLabel(roleKey)}</Badge>
        </InfoItem>
        <InfoItem icon="Building" label="Département">
          {user?.department?.name || '—'}
        </InfoItem>
        <InfoItem icon="MapPin" label="Campus">
          {user?.campus?.name || (user?.campus_id ? `Campus #${user.campus_id}` : 'Tous les campus')}
        </InfoItem>
        <InfoItem icon="ShieldCheck" label="Double authentification">
          <Badge variant={user?.two_fa_enabled ? 'success' : 'neutral'}>
            {user?.two_fa_enabled ? 'Activée' : 'Désactivée'}
          </Badge>
        </InfoItem>
        <InfoItem icon="History" label="Dernière connexion">
          {user?.last_login ? formatDateTime(user.last_login) : 'Jamais'}
        </InfoItem>
        <InfoItem icon="Clock" label="Compte créé le">
          {user?.created_at ? formatDate(user.created_at) : '—'}
        </InfoItem>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
