import { notFound } from '../../core/http-error';
import type { Viewer } from '../access';
import { canViewEvent, eventVisibilityWhere } from './events.policy';
import { EVENT_PAGE, eventsRepository as repo } from './events.repository';
import type { ListEventsQuery } from './events.schemas';

/** Захід, який людина має право бачити; інакше 404 — не розкриваємо існування */
export async function loadVisibleEvent(id: string, viewer: Viewer) {
  const e = await repo.findById(id);
  if (!e || !canViewEvent(e, viewer)) throw notFound();
  return e;
}

export const eventsQueryService = {
  /** Найближчі — від тих, що ще не скінчились; минулі — від найсвіжіших */
  async list(viewer: Viewer, q: ListEventsQuery, now = new Date()) {
    const when = q.when === 'upcoming' ? { endsAt: { gt: now } } : { endsAt: { lte: now } };
    const rows = await repo.list({ AND: [eventVisibilityWhere(viewer), when] }, { startsAt: q.when === 'upcoming' ? 'asc' : 'desc' }, q.offset);
    return { rows: rows.slice(0, EVENT_PAGE), hasMore: rows.length > EVENT_PAGE };
  },

  /** Для календаря: період і, за потреби, лише заходи цих людей — завжди в межах видимості */
  inRange(viewer: Viewer, from: Date, to: Date, people: string[] | null) {
    const who = people ? { participants: { some: { userId: { in: people } } } } : {};
    return repo.inRange({ AND: [eventVisibilityWhere(viewer), who] }, from, to);
  },
};
