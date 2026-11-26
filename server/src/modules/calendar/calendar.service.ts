import type { User } from '@prisma/client';
import type { Viewer } from '../access';
import { eventsQueryService } from '../events';
import { taskQueryService } from '../tasks';
import { subtreeIds, unitTree } from '../units';
import { publicUser, usersRepository } from '../users';
import { eventBlock, taskBar } from './calendar.serializer';
import type { CalendarQuery } from './calendar.schemas';

/** Чиї рядки показати: людину, підрозділ (за потреби з підпорядкованими) або себе */
async function whom(viewer: Viewer, q: CalendarQuery): Promise<User[]> {
  if (q.person) return usersRepository.findActiveByIds([q.person]);
  if (q.unit) {
    const units = q.sub === '1' ? [...subtreeIds(q.unit, await unitTree())] : [q.unit];
    return usersRepository.findActiveByUnits(units);
  }
  return [viewer];
}

/**
 * Календар (ADR-0017) нічого не читає з бази сам: бере завдання й заходи в модулів,
 * і ті завжди накладають видимість глядача — фільтр лише звужує, а не розширює видиме.
 */
export const calendarService = {
  async range(viewer: Viewer, q: CalendarQuery, now = new Date()) {
    const people = await whom(viewer, q);
    const ids = people.map((p) => p.id);
    const set = new Set(ids);
    const [tasks, events] = await Promise.all([
      taskQueryService.inRange(viewer, q.from, q.to, ids, now),
      eventsQueryService.inRange(viewer, q.from, q.to, ids),
    ]);
    return {
      from: q.from,
      to: q.to,
      people: people.map(publicUser),
      items: [...tasks.map((t) => taskBar(t, set)), ...events.map((e) => eventBlock(e, set))].filter((i) => i.personIds.length > 0),
    };
  },
};
