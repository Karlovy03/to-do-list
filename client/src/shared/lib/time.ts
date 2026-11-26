import { t } from './texts';

const TZ = 'Europe/Kyiv';
const dateFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

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

/** «середа, 25 листопада» — підзаголовок великого заголовка */
const longDateFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
export const formatLongDate = (d: Date = new Date()) => longDateFmt.format(d);

const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });

export interface KyivParts {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
  h: number;
  min: number;
}

/** Календарна дата і час цієї миті за Києвом */
export function kyivParts(d: Date): KyivParts {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}

/** Мить, коли в Києві буде вказана дата й час — незалежно від часового поясу пристрою */
export function fromKyiv(y: number, m: number, d: number, h: number, min = 0): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const p = kyivParts(new Date(guess));
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - guess;
  return new Date(guess - offset);
}

/** Мить «через days днів о hour:00 за Києвом» */
export function kyivAt(days: number, hour: number, now = new Date()): Date {
  const day = kyivParts(new Date(now.getTime() + days * 864e5));
  return fromKyiv(day.y, day.m, day.d, hour);
}
