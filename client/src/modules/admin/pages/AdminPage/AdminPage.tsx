import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { t } from '@/shared/lib/texts';
import { PageHeader, Segmented } from '@/shared/ui';
import { DirectoryTab } from '../../components/DirectoryTab/DirectoryTab';
import { RemindersTab } from '../../components/RemindersTab/RemindersTab';
import { UsersTab } from '../../components/UsersTab/UsersTab';
import css from './AdminPage.module.css';

type Tab = 'users' | 'directory' | 'reminders';
const TABS: Tab[] = ['users', 'directory', 'reminders'];

/** Адміністрування; вкладка — в адресі (/admin/directory). Права перевіряє сервер, тут лише не показуємо */
export function AdminPage() {
  const { me } = useSession();
  const navigate = useNavigate();
  const { tab = 'users' } = useParams();
  if (me?.role !== 'ADMIN' || !TABS.includes(tab as Tab)) return <Navigate to="/" replace />;

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
      {tab === 'directory' && <DirectoryTab />}
      {tab === 'reminders' && <RemindersTab />}
    </div>
  );
}
