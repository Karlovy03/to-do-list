import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useLogout, useSession } from '@/modules/auth';
import { PushBanner, usePushSync, useUnread, webPushEndpoint } from '@/modules/notifications';
import { QuickAddSheet } from '@/modules/tasks';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { Loading } from '@/shared/ui';
import { BottomNav } from '../BottomNav/BottomNav';
import { Rail } from '../Rail/Rail';
import { Sidebar } from '../Sidebar/Sidebar';
import css from './Shell.module.css';

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
  // на телефоні картка завдання — окремий екран: замість навігації панель дій
  const focused = phone && /\/t\/[^/]+$/.test(pathname);
  return (
    <div className={[css.shell, css[wc], focused && css.focused].filter(Boolean).join(' ')}>
      {wc === 'lg' && <Sidebar me={me} unread={unread} onCreate={open} onLogout={async () => logout.mutate({ pushEndpoint: await webPushEndpoint() })} />}
      {wc === 'md' && <Rail unread={unread} onCreate={open} />}
      <main className={css.main}>
        <Outlet />
      </main>
      {!focused && <PushBanner />}
      {phone && !focused && <BottomNav unread={unread} onCreate={open} />}
      {creating && <QuickAddSheet me={me} onClose={() => setCreating(false)} />}
    </div>
  );
}
