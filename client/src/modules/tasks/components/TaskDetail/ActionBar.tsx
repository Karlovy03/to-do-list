import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TaskDetail } from '@/shared/api/types';
import { ControlSheet } from '@/modules/control';
import { t } from '@/shared/lib/texts';
import { Button, IconButton, Sheet } from '@/shared/ui';
import { useTaskActions } from '../../hooks/useTaskActions';
import { CommentSheet } from './CommentSheet';
import { DeleteSheet } from './DeleteSheet';
import css from './TaskDetail.module.css';

type Open = null | 'return' | 'close' | 'cancel' | 'removeControl' | 'control' | 'more' | 'reopen' | 'delete';

/** Одна головна дія за правами сервера; рідкісні дії — у меню «⋯» */
export function ActionBar({ task, floating, back }: { task: TaskDetail; floating: boolean; back: string }) {
  const a = useTaskActions(task.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const can = task.can;
  const past = new Date(task.deadline).getTime() <= Date.now();

  const more = [
    can.control && { key: 'control' as const, label: task.control ? t('tasks.actions.change_control') : t('control.control.set') },
    can.removeControl && { key: 'removeControl' as const, label: t('tasks.actions.remove_control') },
    can.closeEarly && { key: 'close' as const, label: t('tasks.actions.close_early') },
    can.cancel && { key: 'cancel' as const, label: t('tasks.actions.cancel') },
    can.delete && { key: 'delete' as const, label: t('tasks.actions.delete') },
  ].filter(Boolean) as { key: Open; label: string }[];

  const primary = can.markDone ? (
    <Button variant="primary" size="l" icon="check" className={css.primary} disabled={a.done.isPending} onClick={() => a.done.mutate('')}>
      {t('tasks.actions.done')}
    </Button>
  ) : can.returnBack ? (
    <Button variant="primary" size="l" icon="undo" className={css.primary} onClick={() => setOpen('return')}>
      {t('tasks.actions.return')}
    </Button>
  ) : can.reopen ? (
    <Button variant="primary" size="l" icon="undo" className={css.primary} onClick={() => (past ? setOpen('reopen') : a.reopen.mutate(undefined))}>
      {t('tasks.actions.reopen')}
    </Button>
  ) : null;

  if (!primary && more.length === 0) return null;

  return (
    <>
      <div className={floating ? `${css.actions} ${css.floating}` : css.actions} data-print="hide">
        {can.snooze && (
          <Button variant="outline" size="l" icon="snooze" aria-label={t('tasks.actions.snooze_label')} onClick={() => a.snooze.mutate(undefined)}>
            {t('tasks.actions.snooze')}
          </Button>
        )}
        {primary ?? (more[0] && (
          <Button variant="outline" size="l" className={css.primary} onClick={() => setOpen(more[0].key)}>
            {more[0].label}
          </Button>
        ))}
        {more.length > (primary ? 0 : 1) && <IconButton icon="more" tone="sunken" label={t('tasks.detail.more')} onClick={() => setOpen('more')} />}
      </div>

      {open === 'more' && (
        <Sheet title={t('tasks.detail.more')} onClose={close}>
          {more.map((m) => (
            <Button key={m.key} variant={m.key === 'cancel' || m.key === 'delete' ? 'danger' : 'outline'} size="l" block onClick={() => setOpen(m.key)}>
              {m.label}
            </Button>
          ))}
        </Sheet>
      )}
      {open === 'return' && (
        <CommentSheet title={t('tasks.actions.return')} label={t('tasks.actions.return_reason')} required needsDeadline={past} confirmLabel={t('tasks.actions.return')}
          busy={a.returnBack.isPending} onClose={close} onConfirm={(comment, deadline) => a.returnBack.mutate({ comment, deadline }, { onSuccess: close })} />
      )}
      {open === 'reopen' && (
        <CommentSheet title={t('tasks.actions.reopen')} label={t('tasks.actions.cancel_reason')} required={false} needsDeadline confirmLabel={t('tasks.actions.reopen')}
          busy={a.reopen.isPending} onClose={close} onConfirm={(_c, deadline) => a.reopen.mutate(deadline, { onSuccess: close })} />
      )}
      {open === 'close' && (
        <CommentSheet title={t('tasks.actions.close_early')} label={t('tasks.actions.close_reason')} required confirmLabel={t('tasks.actions.close_early')}
          busy={a.close.isPending} onClose={close} onConfirm={(comment) => a.close.mutate(comment, { onSuccess: close })} />
      )}
      {open === 'cancel' && (
        <CommentSheet title={t('tasks.actions.cancel')} label={t('tasks.actions.cancel_reason')} required={false} variant="danger" confirmLabel={t('tasks.actions.cancel')}
          busy={a.cancel.isPending} onClose={close} onConfirm={(comment) => a.cancel.mutate(comment, { onSuccess: close })} />
      )}
      {open === 'removeControl' && (
        <CommentSheet title={t('tasks.actions.remove_control')} label={t('tasks.actions.remove_reason')} required={false} confirmLabel={t('tasks.actions.remove_control')}
          busy={a.removeControl.isPending} onClose={close} onConfirm={(reason) => a.removeControl.mutate(reason, { onSuccess: close })} />
      )}
      {open === 'delete' && (
        <DeleteSheet title={task.title} busy={a.remove.isPending} onClose={close} onConfirm={() => a.remove.mutate(undefined, { onSuccess: () => navigate(back, { replace: true }) })} />
      )}
      {open === 'control' && <ControlSheet initial={task.control} busy={a.setControl.isPending} onClose={close} onSave={(v) => a.setControl.mutate(v, { onSuccess: close })} />}
    </>
  );
}
