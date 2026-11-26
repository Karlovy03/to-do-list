import { useNavigate } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import { useReminderSettings } from '@/shared/api/settings';
import { useNow } from '@/shared/hooks/useNow';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { ErrorState, Icon, IconButton, Loading, TimeChip } from '@/shared/ui';
import { useEvent } from '../../hooks/useEvents';
import { durationLabel, eventChip, eventWhen, phaseOf, remindsMe } from '../../lib/eventTime';
import { EventActions } from './EventActions';
import { EventPeople } from './EventPeople';
import css from './EventDetail.module.css';

/** Картка заходу: окремий екран на телефоні, права панель на Fold і комп'ютері */
export function EventDetail({ id, back }: { id: string; back: string }) {
  const q = useEvent(id);
  const { me } = useSession();
  const settings = useReminderSettings();
  const now = useNow();
  const wc = useWindowClass();
  const navigate = useNavigate();
  const phone = wc === 'xs' || wc === 'sm';

  if (q.isLoading) return <Loading />;
  if (!q.data || !me) return <ErrorState message={q.error ? errorText(q.error) : t('events.detail.not_found')} onRetry={() => void q.refetch()} />;

  const e = q.data;
  const chip = eventChip(e, now, true);
  const cancelled = phaseOf(e, now) === 'cancelled';
  const remindIn = remindsMe(e, me, now) ? settings.data?.eventReminderMin : undefined;

  return (
    <article className={css.detail}>
      <div className={css.top}>
        {phone && <IconButton icon="back" tone="glass" label={t('events.detail.back')} onClick={() => navigate(back)} />}
        <span className={css.kind}>{t('events.detail.kind')}</span>
      </div>

      <header className={css.head}>
        <TimeChip tone={chip.tone} time={chip.time} rest={chip.rest} />
        <h1 className={cancelled ? `${css.title} ${css.struck}` : css.title}>{e.title}</h1>
      </header>

      <section className={css.panel} aria-label={t('events.detail.when')}>
        <p className={`${css.row} ${css.strong}`}>
          <Icon name="event" />
          {eventWhen(e, now)}
        </p>
        <p className={css.row}>
          <Icon name="clock" />
          {t('events.detail.duration', { d: durationLabel(e.durationMin) })}
        </p>
        {remindIn !== undefined && (
          <p className={css.row}>
            <Icon name="bell" />
            {t('events.detail.reminder', { n: remindIn })}
          </p>
        )}
      </section>

      <EventPeople event={e} />

      {e.description && (
        <section className={css.panel}>
          <h2 className={css.label}>{t('events.detail.description')}</h2>
          <p className={css.desc}>{e.description}</p>
        </section>
      )}

      <EventActions event={e} me={me} floating={phone} back={back} />
      <div className={css.spacer} />
    </article>
  );
}
