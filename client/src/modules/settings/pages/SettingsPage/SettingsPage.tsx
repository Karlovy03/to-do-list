import { MyAbsences } from '@/modules/absences';
import { useSession } from '@/modules/auth';
import { DevicePanel } from '@/modules/notifications';
import { useUnits } from '@/shared/api/people';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { unitPath } from '@/shared/lib/units';
import { t } from '@/shared/lib/texts';
import { PageHeader } from '@/shared/ui';
import { AccountPanel } from '../../components/AccountPanel/AccountPanel';
import { AppearancePanel } from '../../components/AppearancePanel/AppearancePanel';
import { QuietPanel } from '../../components/QuietPanel/QuietPanel';
import { SectionsPanel } from '../../components/SectionsPanel/SectionsPanel';
import { TopicsPanel } from '../../components/TopicsPanel/TopicsPanel';
import css from './SettingsPage.module.css';

export function SettingsPage() {
  const { me } = useSession();
  const wc = useWindowClass();
  const units = useUnits();
  if (!me) return null;
  return (
    <div className={css.page}>
      <PageHeader eyebrow={[me.fullName, unitPath(me.unitId, units.data ?? [])].filter(Boolean).join(' · ')} title={t('settings.profile.title')} />
      <div className={css.columns}>
        {wc !== 'lg' && <SectionsPanel me={me} />}
        <MyAbsences me={me} />
        <DevicePanel />
        <TopicsPanel me={me} />
        <QuietPanel me={me} />
        <AppearancePanel me={me} />
        <AccountPanel />
      </div>
    </div>
  );
}
