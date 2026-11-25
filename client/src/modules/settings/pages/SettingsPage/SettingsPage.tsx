import { useSession } from '@/modules/auth';
import { DevicePanel } from '@/modules/notifications';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { PageHeader } from '@/shared/ui';
import { AccountPanel } from '../../components/AccountPanel/AccountPanel';
import { AppearancePanel } from '../../components/AppearancePanel/AppearancePanel';
import { QuietPanel } from '../../components/QuietPanel/QuietPanel';
import { TopicsPanel } from '../../components/TopicsPanel/TopicsPanel';
import css from './SettingsPage.module.css';

export function SettingsPage() {
  const { me } = useSession();
  const wc = useWindowClass();
  if (!me) return null;
  return (
    <div className={css.page}>
      <PageHeader eyebrow={me.fullName} title={t('settings.profile.title')} />
      <div className={css.columns}>
        <DevicePanel />
        <TopicsPanel me={me} />
        <QuietPanel me={me} />
        <AppearancePanel />
        <AccountPanel me={me} phone={wc === 'xs' || wc === 'sm'} />
      </div>
    </div>
  );
}
