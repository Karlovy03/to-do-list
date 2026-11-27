import { useState } from 'react';
import { Navigate, Outlet, ScrollRestoration, useLocation, type Location } from 'react-router-dom';
import { useLogout, useSession } from '@/modules/auth';
import { PushBanner, usePushSync, useUnread } from '@/modules/notifications';
import { LizardCheer } from '@/modules/tasks';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { Loading } from '@/shared/ui';
import { UpdateBanner } from '../../update/UpdateBanner/UpdateBanner';
import { BottomNav } from '../BottomNav/BottomNav';
import { CreateSheet } from '../CreateSheet/CreateSheet';
import { Rail } from '../Rail/Rail';
import { Sidebar } from '../Sidebar/Sidebar';
import css from './Shell.module.css';

/**
 * Місце в списку — за адресою, а не за кроком історії (ADR-0022): «Назад» у картці веде на адресу списку
 * новим кроком, і саме за адресою людина повертається туди, де була. Зберігається в пам'яті вкладки.
 */
const placeKey = (l: Location) => l.pathname + l.search;

/** Оболонка: навігація залежить від класу вікна, вміст — від маршруту */
export function Shell() {
  const { me, isLoading } = useSession();
  const logout = useLogout();
  const unread = useUnread();
  const wc = useWindowClass();
  const [creating, setCreating] = useState(false);
  const { pathname } = useLocation();
  usePushSync(me?.id);

  if (isLoading) return <Loading />;
  if (!me) return <Navigate to="/login" replace />;

  const open = () => setCreating(true);
  const phone = wc === 'sm' || wc === 'xs';
  // на телефоні картка завдання чи заходу — окремий екран: замість навігації панель дій
  const focused = phone && /\/[te]\/[^/]+$/.test(pathname);
  return (
    <div className={[css.shell, css[wc], focused && css.focused].filter(Boolean).join(' ')}>
      {wc === 'lg' && <Sidebar me={me} unread={unread} onCreate={open} onLogout={() => logout.mutate()} />}
      {wc === 'md' && <Rail unread={unread} onCreate={open} />}
      <main className={css.main}>
        <Outlet />
        <ScrollRestoration getKey={placeKey} />
      </main>
      <UpdateBanner />
      <LizardCheer />
      {!focused && <PushBanner />}
      {phone && !focused && <BottomNav unread={unread} onCreate={open} />}
      {creating && <CreateSheet me={me} initial={pathname.startsWith('/events') ? 'event' : 'task'} onClose={() => setCreating(false)} />}
    </div>
  );
}
