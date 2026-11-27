import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ latestVisit: vi.fn(), startVisit: vi.fn(), extendVisit: vi.fn() }));
vi.mock('./monitoring.repository', () => ({ monitoringRepository: repo }));
const { activityTracker, VISIT_GAP_MS, WRITE_EVERY_MS } = await import('./activity.tracker');

const T0 = new Date('2026-11-28T07:00:00Z');
const after = (ms: number) => new Date(T0.getTime() + ms);

beforeEach(() => {
  vi.clearAllMocks();
  activityTracker.forget();
  repo.latestVisit.mockResolvedValue(null);
  repo.startVisit.mockImplementation(async (_u: string, at: Date) => ({ id: `v${at.getTime()}`, lastAt: at }));
  repo.extendVisit.mockImplementation(async (id: string, at: Date) => ({ id, lastAt: at }));
});

describe('візити', () => {
  it('перший запит — новий візит; наступні впродовж хвилини база не бачить', async () => {
    await activityTracker.touch('bondar', T0);
    await activityTracker.touch('bondar', after(30_000));
    expect(repo.startVisit).toHaveBeenCalledTimes(1);
    expect(repo.extendVisit).not.toHaveBeenCalled();
  });
  it('через хвилину — той самий візит подовжується', async () => {
    await activityTracker.touch('bondar', T0);
    await activityTracker.touch('bondar', after(WRITE_EVERY_MS));
    expect(repo.extendVisit).toHaveBeenCalledWith(`v${T0.getTime()}`, after(WRITE_EVERY_MS));
  });
  it('перерва понад 30 хв — новий візит; рівно 30 хв — ще той самий', async () => {
    await activityTracker.touch('bondar', T0);
    await activityTracker.touch('bondar', after(VISIT_GAP_MS));
    expect(repo.extendVisit).toHaveBeenCalledTimes(1);
    await activityTracker.touch('bondar', after(2 * VISIT_GAP_MS + 1));
    expect(repo.startVisit).toHaveBeenCalledTimes(2);
  });
  it('після перезапуску сервера — останній візит із бази: свіжий подовжується, давній — ні', async () => {
    repo.latestVisit.mockResolvedValue({ id: 'old', lastAt: after(-10 * 60_000) });
    await activityTracker.touch('bondar', T0);
    expect(repo.extendVisit).toHaveBeenCalledWith('old', T0);
    activityTracker.forget();
    repo.latestVisit.mockResolvedValue({ id: 'older', lastAt: after(-31 * 60_000) });
    await activityTracker.touch('bondar', T0);
    expect(repo.startVisit).toHaveBeenCalledWith('bondar', T0);
  });
  it('кілька одночасних запитів однієї людини — один запис', async () => {
    await Promise.all([activityTracker.touch('bondar', T0), activityTracker.touch('bondar', T0), activityTracker.touch('bondar', T0)]);
    expect(repo.startVisit).toHaveBeenCalledTimes(1);
  });
});
