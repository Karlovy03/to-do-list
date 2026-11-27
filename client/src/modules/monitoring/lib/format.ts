import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { dayKey, formatTime } from '@/shared/lib/time';

const NB = ' ';
const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const comma = (n: number) => n.toFixed(1).replace('.', ',').replace(/,0$/, '');

/** «742 МБ», «9,8 ГБ» */
export function bytes(b: number): string {
  if (b >= GB) return `${comma(b / GB)}${NB}${t('monitoring.units.gb')}`;
  return `${Math.round(b / MB)}${NB}${t('monitoring.units.mb')}`;
}

export const percent = (p: number) => `${Math.round(p)}${NB}%`;

/** «3 дн 4 год», «5 год 12 хв», «18 хв» */
export function uptime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return t('monitoring.units.days_hours', { d, h });
  if (h > 0) return t('monitoring.units.hours_min', { h, m: m % 60 });
  return t('monitoring.units.min', { m });
}

/** Тривалість візиту: «2 год 20 хв», «12 хв», «менше хвилини» */
export function duration(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return t('monitoring.units.less_min');
  return m < 60 ? t('monitoring.units.min', { m }) : t('monitoring.units.hours_min', { h: Math.floor(m / 60), m: m % 60 });
}

/**
 * Коли людина була: «щойно», «12 хв тому», «сьогодні о 09:40», «учора о 17:40», «9 днів тому».
 * Без «був/була»: роду людини система не знає.
 */
export function seen(iso: string | null, now = new Date()): string {
  if (!iso) return t('monitoring.people.never');
  const d = new Date(iso);
  const ms = now.getTime() - d.getTime();
  if (ms < 2 * 60_000) return t('monitoring.people.just_now');
  if (ms < 60 * 60_000) return t('monitoring.people.min_ago', { n: Math.round(ms / 60_000) });
  if (dayKey(d) === dayKey(now)) return t('monitoring.people.today_at', { time: formatTime(d) });
  if (dayKey(d) === dayKey(new Date(now.getTime() - 864e5))) return t('monitoring.people.yesterday_at', { time: formatTime(d) });
  const days = Math.max(2, Math.round(ms / 864e5));
  return t(`monitoring.people.days_ago_${pluralForm(days)}`, { n: days });
}

/** «21 день за місяць» */
export const daysOfMonth = (n: number) => t(`monitoring.people.days30_${pluralForm(n)}`, { n });

/** Давно не заходили — понад 7 днів або ще ні разу (як рахує сервер) */
export const AWAY_MS = 7 * 864e5;
export const isAway = (row: { online: boolean; lastAt: string | null }, now = new Date()) =>
  !row.online && (!row.lastAt || now.getTime() - Date.parse(row.lastAt) > AWAY_MS);
