import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppEvent, Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { ActionDock, Button, Field, Icon, Sheet, TextArea } from '@/shared/ui';
import { useEventActions } from '../../hooks/useEventActions';
import { eventChanges } from '../../lib/eventChanges';
import { EventForm } from '../EventForm/EventForm';
import css from './EventDetail.module.css';

type Open = null | 'edit' | 'cancel' | 'delete';

/**
 * Дії за правами сервера: поки захід не скінчився — «Змінити» і «Скасувати»;
 * після скасування чи завершення — «Видалити» (організатор, директор, адміністратор).
 */
export function EventActions({ event, me, floating, back }: { event: AppEvent; me: Me; floating: boolean; back: string }) {
  const a = useEventActions(event.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState<Open>(null);
  const [reason, setReason] = useState('');
  const close = () => setOpen(null);
  const { can } = event;
  if (!can.edit && !can.cancel && !can.delete) return null;

  return (
    <>
      <ActionDock floating={floating}>
        {can.edit && (
          <Button variant="outline" size="l" className={css.grow} onClick={() => setOpen('edit')}>
            {t('events.actions.edit')}
          </Button>
        )}
        {can.cancel && (
          <Button variant="danger" size="l" className={css.grow} onClick={() => setOpen('cancel')}>
            {t('events.actions.cancel')}
          </Button>
        )}
        {!can.cancel && can.delete && (
          <Button variant="outline" size="l" icon="x" className={css.grow} onClick={() => setOpen('delete')}>
            {t('events.actions.delete')}
          </Button>
        )}
      </ActionDock>

      {open === 'edit' && (
        <Sheet title={t('events.actions.edit_title')} onClose={close}>
          <EventForm
            me={me}
            initial={event}
            busy={a.update.isPending}
            onSubmit={(input) => {
              const changes = eventChanges(event, input);
              if (Object.keys(changes).length) a.update.mutate(changes, { onSuccess: close });
              else close();
            }}
          />
        </Sheet>
      )}
      {open === 'cancel' && (
        <Sheet
          title={t('events.actions.cancel_title')}
          onClose={close}
          footer={
            <Button variant="danger" size="l" disabled={a.cancel.isPending} onClick={() => a.cancel.mutate(reason.trim(), { onSuccess: close })}>
              {t('events.actions.cancel_confirm')}
            </Button>
          }
        >
          <p className={css.sheetSubject}>{event.title}</p>
          <Field label={t('events.actions.cancel_reason')}>
            <TextArea rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <p className={css.sheetHint}>{t('events.actions.cancel_hint')}</p>
        </Sheet>
      )}
      {open === 'delete' && (
        <Sheet
          title={t('events.actions.delete_title')}
          onClose={close}
          footer={
            <Button variant="danger" size="l" icon="x" disabled={a.remove.isPending} onClick={() => a.remove.mutate(undefined, { onSuccess: () => navigate(back, { replace: true }) })}>
              {t('events.actions.delete_confirm')}
            </Button>
          }
        >
          <p className={css.sheetSubject}>{event.title}</p>
          <p className={css.warning}>
            <Icon name="alert" size={20} />
            {t('events.actions.delete_warning')}
          </p>
        </Sheet>
      )}
    </>
  );
}
