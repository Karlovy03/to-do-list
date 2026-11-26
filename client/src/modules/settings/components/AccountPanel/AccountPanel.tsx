import { useState } from 'react';
import type { Me } from '@/shared/api/types';
import { useLogout } from '@/modules/auth';
import { t } from '@/shared/lib/texts';
import { Card } from '@/shared/ui';
import { PasswordSheet } from '../PasswordSheet/PasswordSheet';
import { RowButton } from '../RowButton/RowButton';

/** Пароль і вихід; на телефоні ще й посилання на розділи, яких немає в нижній навігації */
export function AccountPanel({ me, phone }: { me: Me; phone: boolean }) {
  const [password, setPassword] = useState(false);
  const logout = useLogout();
  const lead = me.role !== 'MEMBER';

  return (
    <>
      {phone && lead && (
        <Card title={t('settings.account.sections')}>
          <RowButton icon="printer" to="/report">{t('app.nav.report')}</RowButton>
          {me.role === 'ADMIN' && <RowButton icon="admin" to="/admin">{t('app.nav.admin')}</RowButton>}
        </Card>
      )}
      <Card title={t('settings.account.title')}>
        <RowButton onClick={() => setPassword(true)}>{t('settings.account.password')}</RowButton>
        <RowButton danger onClick={() => logout.mutate()}>{t('settings.account.logout')}</RowButton>
      </Card>
      {password && <PasswordSheet onClose={() => setPassword(false)} />}
    </>
  );
}
