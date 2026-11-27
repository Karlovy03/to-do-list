import { t } from '@/shared/lib/texts';
import { formatTime } from '@/shared/lib/time';
import { Icon } from '@/shared/ui';
import type { ServerStatus } from '../../api/monitoring.api';
import { uptime } from '../../lib/format';
import css from './ServerBanner.module.css';

/** Смуга стану сервера (Figma «Моніторинг / Стан сервера»): найгірший показник — у заголовку */
export function ServerBanner({ status }: { status: ServerStatus }) {
  const time = formatTime(status.checkedAt);
  const [first, ...rest] = status.reasons;
  const title = first ? t(`monitoring.server.${status.level}_title`, { what: t(`monitoring.server.reason_${first}`) }) : t('monitoring.server.ok_title');
  const text = first
    ? [rest.map((r) => t(`monitoring.server.reason_${r}`)).join(', '), t('monitoring.server.checked', { time })].filter(Boolean).join(' · ')
    : t('monitoring.server.ok_text', { uptime: uptime(status.metrics.host.uptimeS), time });
  return (
    <section className={`${css.banner} ${css[status.level]}`} role="status">
      <Icon name={status.level === 'ok' ? 'check' : 'alert'} size={24} />
      <span className={css.text}>
        <b>{title}</b>
        <span>{text}</span>
      </span>
    </section>
  );
}
