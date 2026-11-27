import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { MonitoringSection } from '@/modules/monitoring';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { PageHeader, Segmented } from '@/shared/ui';
import { DirectoryTab } from '../../components/DirectoryTab/DirectoryTab';
import { RemindersTab } from '../../components/RemindersTab/RemindersTab';
import { UnitsTab } from '../../components/UnitsTab/UnitsTab';
import { UsersTab } from '../../components/UsersTab/UsersTab';
import css from './AdminPage.module.css';

type Tab = 'users' | 'units' | 'directory' | 'reminders' | 'monitoring';
const TABS: Tab[] = ['users', 'units', 'directory', 'reminders', 'monitoring'];

/** Адміністрування; вкладка — в адресі (/admin/directory, /admin/monitoring/server). Права перевіряє сервер, тут лише не показуємо */
export function AdminPage() {
  const { me } = useSession();
  const navigate = useNavigate();
  const wc = useWindowClass();
  const { tab = 'users', sub } = useParams();
  const subOk = tab === 'monitoring' ? sub === undefined || sub === 'server' : sub === undefined;
  if (me?.role !== 'ADMIN' || !TABS.includes(tab as Tab) || !subOk) return <Navigate to="/" replace />;

  // поза комп'ютером «Моніторинг» — окремий екран зі своїм заголовком (Figma 51–55)
  if (tab === 'monitoring' && wc !== 'lg') {
    return (
      <div className={css.page}>
        <PageHeader eyebrow={wc === 'xs' ? undefined : t(wc === 'sm' ? 'monitoring.page.eyebrow_phone' : 'monitoring.page.eyebrow')} title={t('monitoring.page.title')} />
        <MonitoringSection view={sub === 'server' ? 'server' : 'visits'} />
      </div>
    );
  }

  return (
    <div className={css.page}>
      <PageHeader title={t('admin.common.title')} />
      <div className={css.tabs}>
        <Segmented<Tab>
          label={t('admin.common.tabs_label')}
          value={tab as Tab}
          onChange={(x) => navigate(x === 'users' ? '/admin' : `/admin/${x}`)}
          options={TABS.map((x) => ({ value: x, label: t(`admin.common.tab_${x}`) }))}
        />
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'units' && <UnitsTab />}
      {tab === 'directory' && <DirectoryTab />}
      {tab === 'reminders' && <RemindersTab />}
      {tab === 'monitoring' && <MonitoringSection view={sub === 'server' ? 'server' : 'visits'} />}
    </div>
  );
}
