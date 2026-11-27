import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Card } from '@/shared/ui';
import { RowButton } from '../RowButton/RowButton';

/** Розділи, яких немає в нижній навігації й рейці (Figma 25); на комп'ютері вони в бічній панелі */
export function SectionsPanel({ me }: { me: Me }) {
  if (me.role === 'MEMBER') return null;
  return (
    <Card title={t('settings.account.sections')}>
      <RowButton icon="users" to="/strength">{t('app.nav.strength')}</RowButton>
      <RowButton icon="printer" to="/report">{t('app.nav.report')}</RowButton>
      {me.role === 'ADMIN' && <RowButton icon="admin" to="/admin">{t('app.nav.admin')}</RowButton>}
    </Card>
  );
}
