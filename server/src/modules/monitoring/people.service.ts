import { addDays, kyivDay } from '../../core/time';
import { liveHub } from '../live';
import { unitTree } from '../units';
import { publicUser, usersRepository } from '../users';
import { monitoringRepository as repo, VISITS_PAGE } from './monitoring.repository';

const DAY_MS = 24 * 60 * 60_000;
/** «Давно не заходили» — понад 7 днів або ще ні разу (погоджено в макетах 49–55) */
export const AWAY_DAYS = 7;
export const CHART_DAYS = 30;

export const peopleService = {
  /** Усі активні люди зі статусом, підсумок і стовпчики «скільки людей заходило» за 30 днів */
  async overview(now = new Date()) {
    const [users, stats, daily, units] = await Promise.all([
      usersRepository.list(false),
      repo.personStats(new Date(now.getTime() - CHART_DAYS * DAY_MS)),
      repo.dailyPeople(new Date(now.getTime() - (CHART_DAYS + 1) * DAY_MS)),
      unitTree(),
    ]);
    const online = liveHub.onlineUserIds();
    const byUser = new Map(stats.map((s) => [s.userId, s]));
    const unitName = new Map(units.map((u) => [u.id, u.name]));
    const today = kyivDay(now);
    const weekAgo = now.getTime() - AWAY_DAYS * DAY_MS;

    const items = users.map((u) => {
      const s = byUser.get(u.id);
      return {
        person: publicUser(u),
        unitName: u.unitId ? (unitName.get(u.unitId) ?? null) : null,
        online: online.has(u.id),
        lastAt: s ? s.lastAt.toISOString() : null,
        visits30: s?.visits ?? 0,
        days30: s?.days ?? 0,
      };
    });
    // онлайн першими, далі — хто заходив нещодавно; хто ще не заходив — наприкінці за прізвищем
    items.sort((a, b) => Number(b.online) - Number(a.online) || (b.lastAt ?? '').localeCompare(a.lastAt ?? '') || a.person.fullName.localeCompare(b.person.fullName, 'uk'));

    const seen = (i: (typeof items)[number]) => (i.lastAt ? Date.parse(i.lastAt) : null);
    const counts = new Map(daily.map((d) => [d.day, d.people]));
    return {
      items,
      summary: {
        total: items.length,
        online: items.filter((i) => i.online).length,
        today: items.filter((i) => i.online || (i.lastAt !== null && kyivDay(new Date(i.lastAt)) === today)).length,
        week: items.filter((i) => i.online || (seen(i) ?? 0) >= weekAgo).length,
        away: items.filter((i) => !i.online && (seen(i) ?? 0) < weekAgo).length,
      },
      daily: Array.from({ length: CHART_DAYS }, (_, k) => {
        const day = addDays(today, k - CHART_DAYS + 1);
        return { day, people: counts.get(day) ?? 0 };
      }),
    };
  },

  /** Візити людини (новіші першими) і дні за 30 днів, коли вона заходила */
  async visits(userId: string, offset: number, now = new Date()) {
    const rows = await repo.visitsOf(userId, offset);
    return {
      items: rows.slice(0, VISITS_PAGE).map((v) => ({ startedAt: v.startedAt.toISOString(), lastAt: v.lastAt.toISOString() })),
      hasMore: rows.length > VISITS_PAGE,
      activeDays: offset === 0 ? await repo.activeDaysOf(userId, new Date(now.getTime() - CHART_DAYS * DAY_MS)) : undefined,
      online: liveHub.onlineUserIds().has(userId),
    };
  },
};
