import { errorText } from '@/shared/api/errors';
import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { dayKey } from '@/shared/lib/time';
import { Button, Empty, ErrorState, Loading, PageHeader } from '@/shared/ui';
import { NotificationCard } from '../../components/NotificationCard/NotificationCard';
import { useFeed, useMarkRead } from '../../hooks/useFeed';
import css from './NotificationsPage.module.css';

/** Стрічка: «Сьогодні» і «Раніше»; торкання відкриває завдання і позначає прочитаним */
export function NotificationsPage() {
  const feed = useFeed();
  const markRead = useMarkRead();
  const unread = feed.data?.unread ?? 0;
  const items = feed.data?.items ?? [];
  const today = dayKey(new Date());
  const groups = [
    { id: 'today', items: items.filter((n) => dayKey(new Date(n.createdAt)) === today) },
    { id: 'earlier', items: items.filter((n) => dayKey(new Date(n.createdAt)) !== today) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow={unread ? `${unread} ${t(`notifications.list.new_${pluralForm(unread)}`)}` : t('notifications.list.all_read')}
        title={t('notifications.list.title')}
        actions={
          unread > 0 && (
            <Button size="s" variant="outline" icon="check" disabled={markRead.isPending} onClick={() => markRead.mutate(undefined)}>
              {t('notifications.list.mark_all')}
            </Button>
          )
        }
      />
      {feed.isLoading ? (
        <Loading />
      ) : feed.error ? (
        <ErrorState message={errorText(feed.error)} onRetry={() => void feed.refetch()} />
      ) : groups.length === 0 ? (
        <Empty icon="bell" title={t('notifications.list.empty')} />
      ) : (
        groups.map((g) => (
          <section key={g.id} className={css.group} aria-label={t(`notifications.list.${g.id}`)}>
            <h2 className={css.groupTitle}>{t(`notifications.list.${g.id}`)}</h2>
            {g.items.map((n) => (
              <NotificationCard key={n.id} item={n} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
