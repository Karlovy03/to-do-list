import { kyivAt } from '@/shared/lib/time';

/** Швидкі терміни; «сьогодні 18:00» зникає ввечері */
export function quickDeadlines(now = new Date()) {
  const list = [
    { key: 'quick_today', at: kyivAt(0, 18, now) },
    { key: 'quick_tomorrow', at: kyivAt(1, 10, now) },
    { key: 'quick_3days', at: kyivAt(3, 18, now) },
    { key: 'quick_week', at: kyivAt(7, 18, now) },
  ];
  return list.filter((d) => d.at.getTime() > now.getTime() + 30 * 60_000);
}
