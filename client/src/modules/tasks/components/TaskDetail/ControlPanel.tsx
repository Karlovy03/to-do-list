import type { TaskControl } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import css from './TaskDetail.module.css';

/** Хто контролює, підстава, як часто нагадувати */
export function ControlPanel({ control }: { control: TaskControl }) {
  const c = control.controller;
  const interval = control.reminderInterval;
  return (
    <section className={css.panel} aria-label={t('control.control.section')}>
      <div className={css.controller}>
        <span className={css.controlIcon}>
          <Icon name="shieldCheck" size={20} />
        </span>
        <div className={css.grow}>
          <b>{c?.name}</b>
          {c?.position && <small>{c.position}</small>}
        </div>
      </div>
      {control.basis && (
        <p className={css.meta}>
          <Icon name="doc" size={16} />
          {control.basis}
        </p>
      )}
      <p className={css.meta}>
        <Icon name="clock" size={16} />
        {interval ? t('control.intervals.every_n', { n: interval >= 60 ? `${interval / 60} ${t('shared.time.hours_short')}` : `${interval} ${t('shared.time.min_short')}` }) : t('control.intervals.default_note')}
      </p>
    </section>
  );
}
