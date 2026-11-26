import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '@/shared/api/types';
import { useTaskActions } from '@/modules/tasks';
import { t } from '@/shared/lib/texts';
import { ago } from '@/shared/lib/time';
import { Button, Icon } from '@/shared/ui';
import { useMarkRead } from '../../hooks/useFeed';
import { ACTIONABLE, kindLook } from '../../lib/kinds';
import css from './NotificationCard.module.css';

/** Сповіщення: значок за видом, крапка «непрочитане»; по нагадуваннях — «Виконано» і «Відкласти» */
export function NotificationCard({ item }: { item: AppNotification }) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const look = kindLook(item.kind);
  const unread = !item.readAt;
  const read = () => unread && markRead.mutate([item.id]);
  const open = () => {
    read();
    if (item.taskId) navigate(`/t/${item.taskId}`);
    else if (item.eventId) navigate(`/events/e/${item.eventId}`);
  };

  return (
    <article className={unread ? `${css.card} ${css.unread}` : css.card}>
      <button type="button" className={css.main} onClick={open}>
        <span className={`${css.icon} ${css[look.tone]}`}>
          <Icon name={look.icon} size={20} />
        </span>
        <span className={css.text}>
          <b className={css.title}>{item.title}</b>
          {item.body && <span className={css.body}>{item.body}</span>}
          <small className={css.time}>{ago(item.createdAt)}</small>
        </span>
        {unread && <span className={css.dot} role="img" aria-label={t('notifications.list.unread')} />}
      </button>
      {unread && item.taskId && ACTIONABLE.has(item.kind) && <QuickActions taskId={item.taskId} onDone={read} />}
    </article>
  );
}

function QuickActions({ taskId, onDone }: { taskId: string; onDone: () => void }) {
  const a = useTaskActions(taskId);
  return (
    <div className={css.actions}>
      <Button variant="primary" size="s" icon="check" disabled={a.done.isPending} onClick={() => a.done.mutate('', { onSuccess: onDone })}>
        {t('notifications.list.done')}
      </Button>
      <Button variant="outline" size="s" icon="snooze" disabled={a.snooze.isPending} onClick={() => a.snooze.mutate(undefined, { onSuccess: onDone })}>
        {t('notifications.list.snooze')}
      </Button>
    </div>
  );
}
