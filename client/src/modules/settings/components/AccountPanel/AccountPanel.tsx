import { useState } from 'react';
import { useLogout } from '@/modules/auth';
import { t } from '@/shared/lib/texts';
import { Card } from '@/shared/ui';
import { PasswordSheet } from '../PasswordSheet/PasswordSheet';
import { RowButton } from '../RowButton/RowButton';

/** Пароль і вихід */
export function AccountPanel() {
  const [password, setPassword] = useState(false);
  const logout = useLogout();

  return (
    <>
      <Card title={t('settings.account.title')}>
        <RowButton onClick={() => setPassword(true)}>{t('settings.account.password')}</RowButton>
        <RowButton danger onClick={() => logout.mutate()}>{t('settings.account.logout')}</RowButton>
      </Card>
      {password && <PasswordSheet onClose={() => setPassword(false)} />}
    </>
  );
}
