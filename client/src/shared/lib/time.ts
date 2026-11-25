import { t } from './texts';

const TZ = 'Europe/Kyiv';
const dateFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

export const formatFull = (iso: string | Date) => fullFmt.format(new Date(iso));
export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));

/** «сьогодні, 18:00», «завтра, 10:00», «3 грудня, 12:00» */
export function formatDeadline(iso: string | Date) {
  const d = new Date(iso);
  const now = new Date();
  const k = dayKey(d);
  const day =
    k === dayKey(now) ? t('shared.time.today')
    : k === dayKey(new Date(now.getTime() + 864e5)) ? t('shared.time.tomorrow')
    : k === dayKey(new Date(now.getTime() - 864e5)) ? t('shared.time.yesterday')
    : dateFmt.format(d);
  return `${day}, ${timeFmt.format(d)}`;
}

/** Скорочена тривалість: «45 хв», «5 год», «3 дн» */
export function shortDuration(ms: number) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (min < 60) return t('shared.time.min', { n: min });
  const h = Math.round(min / 60);
  if (h < 48) return t('shared.time.hours', { n: h });
  return t('shared.time.days', { n: Math.round(h / 24) });
}

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return ms >= 0
    ? { overdue: false, text: `${t('shared.time.left')} ${shortDuration(ms)}`, ms }
    : { overdue: true, text: `${t('shared.time.overdue_by')} ${shortDuration(ms)}`, ms };
}

export function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return t('shared.time.just_now');
  if (ms > 7 * 864e5) return formatFull(iso);
  return `${shortDuration(ms)} ${t('shared.time.ago')}`;
}

/** Значення для <input type="datetime-local"> у місцевому часі пристрою */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
