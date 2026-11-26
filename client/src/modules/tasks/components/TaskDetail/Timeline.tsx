import { useState } from 'react';
import type { TaskDetail, TaskUpdate } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { ago } from '@/shared/lib/time';
import { Button, Icon, LoadMore, ProgressRing, TextArea, type IconName } from '@/shared/ui';
import { useOlderUpdates } from '../../hooks/useTasks';
import { useTaskActions } from '../../hooks/useTaskActions';
import css from './TaskDetail.module.css';

function describe(u: TaskUpdate): { text: string; icon: IconName; tone: 'info' | 'ok' | 'control' } {
  const action = typeof u.meta?.action === 'string' ? u.meta.action : null;
  if (u.kind === 'STATUS' && action) return { text: t(`tasks.history.action_${action}`), icon: action.startsWith('done') ? 'check' : 'play', tone: action.startsWith('done') ? 'ok' : 'info' };
  if (u.kind === 'PROGRESS') return { text: t('tasks.history.PROGRESS', { n: u.progress ?? 0 }), icon: 'message', tone: 'info' };
  if (u.kind === 'CONTROL_ON' || u.kind === 'CONTROL_OFF') return { text: t(`tasks.history.${u.kind}`), icon: 'shieldCheck', tone: 'control' };
  return { text: t(`tasks.history.${u.kind}`), icon: u.kind === 'COMMENT' ? 'message' : 'play', tone: 'info' };
}

/** Хід виконання: необов'язкова нотатка з відсотком і журнал подій */
export function Timeline({ task }: { task: TaskDetail }) {
  const actions = useTaskActions(task.id);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(task.progress);
  const [seen, setSeen] = useState(task.progress);
  // готовність змінилась на сервері (повернення в роботу, чужа нотатка) — повзунок іде за нею
  if (seen !== task.progress) {
    setSeen(task.progress);
    setProgress(task.progress);
  }
  const changed = text.trim().length > 0 || progress !== task.progress;
  const [older, setOlder] = useState(false);
  const history = useOlderUpdates(task.id, task.updates.length, older);
  // нові записи зсувають offset — той самий запис може прийти двічі
  const updates = [...new Map([...task.updates, ...history.items].map((u) => [u.id, u])).values()];
  const hasOlder = older ? history.hasMore : task.hasMoreUpdates;

  const send = () =>
    actions.addNote.mutate({ text: text.trim(), progress: progress !== task.progress ? progress : undefined }, { onSuccess: () => setText('') });

  return (
    <section className={css.panel} aria-label={t('tasks.history.title')}>
      <div className={css.panelHead}>
        <h3>{t('tasks.history.title')}</h3>
        <ProgressRing size={44} value={task.progress} label={t('tasks.detail.progress', { n: task.progress })} />
      </div>
      {task.can.note && (
        <div className={css.composer}>
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('tasks.history.note_placeholder')} rows={2} />
          <div className={css.composerRow}>
            <input
              className={css.range}
              type="range"
              min={0}
              max={100}
              step={10}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              aria-label={t('tasks.detail.progress_label')}
            />
            <b className={css.percent}>{progress}%</b>
            <Button size="s" variant="sky" disabled={!changed || actions.addNote.isPending} onClick={send}>
              {t('tasks.history.note_send')}
            </Button>
          </div>
        </div>
      )}
      <ol className={css.timeline}>
        {updates.map((u) => {
          const d = describe(u);
          return (
            <li key={u.id} className={css.event}>
              <span className={`${css.eventIcon} ${css[d.tone]}`}>
                <Icon name={d.icon} size={16} />
              </span>
              <div className={css.grow}>
                <p>
                  <b>{u.author?.fullName ?? t('tasks.history.system')}</b> {d.text}
                </p>
                {u.text && <p className={css.quote}>{u.text}</p>}
                <small>{ago(u.createdAt)}</small>
              </div>
            </li>
          );
        })}
      </ol>
      {hasOlder && <LoadMore busy={history.isFetching} onClick={() => (older ? history.loadMore() : setOlder(true))} />}
    </section>
  );
}
