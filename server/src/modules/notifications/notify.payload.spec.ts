import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/settings.schemas';

const users = vi.hoisted(() => ({ findActiveByIds: vi.fn() }));
const feed = vi.hoisted(() => ({ createMany: vi.fn() }));
const pushToUser = vi.hoisted(() => vi.fn());

vi.mock('../users', () => ({ usersRepository: users }));
vi.mock('../settings', () => ({ getSettings: async () => DEFAULT_SETTINGS }));
vi.mock('./feed.repository', () => ({ feedRepository: feed }));
vi.mock('./push/dispatcher', () => ({ pushToUser }));

const { notify } = await import('./notify.service');

// 2026-11-25 — середа. 12:00 за Києвом = 10:00 UTC; 22:00 за Києвом = 20:00 UTC
const DAY = new Date('2026-11-25T10:00:00Z');
const NIGHT = new Date('2026-11-25T20:00:00Z');
const user = (id: string) => ({
  id, isActive: true, quietFrom: 20, quietTo: 8, muteWeekends: true,
  notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true,
});
const task = { id: 't1', number: 12, title: 'Довідка до наради', priority: 'NORMAL' as const, deadline: new Date('2026-11-27T16:00:00Z') };

beforeEach(() => {
  vi.clearAllMocks();
  users.findActiveByIds.mockResolvedValue([user('chief')]);
});

describe('вміст push (ADR-0005)', () => {
  it('ПІБ виконавця і коментар ідуть лише в стрічку, push містить тип, № і назву', async () => {
    await notify({ event: 'DONE_PART', task, to: ['chief'], who: 'Бондар Андрій', comment: { name: 'Бондар Андрій', text: 'Надіслав поштою' } }, DAY);
    const payload = pushToUser.mock.calls[0][1];
    const pushed = JSON.stringify(payload);
    expect(pushed).not.toContain('Бондар');
    expect(pushed).not.toContain('Надіслав');
    expect(payload.body).toContain('№12');
    expect(payload.body).toContain('Довідка до наради');
    const row = feed.createMany.mock.calls[0][0][0];
    expect(row.body).toContain('Бондар Андрій');
    expect(row.body).toContain('Надіслав поштою');
  });
});

describe('тихі години', () => {
  it('нове завдання вночі: запис у стрічці одразу, push відкладено до ранку', async () => {
    await notify({ event: 'ASSIGNED', task, to: ['chief'] }, NIGHT);
    expect(pushToUser).not.toHaveBeenCalled();
    expect(feed.createMany.mock.calls[0][0][0]).toMatchObject({ pushDeferred: true });
  });

  it('коментар уночі лише в стрічці — його push не відкладається', async () => {
    await notify({ event: 'COMMENT', task, to: ['chief'] }, NIGHT);
    expect(pushToUser).not.toHaveBeenCalled();
    expect(feed.createMany.mock.calls[0][0][0]).toMatchObject({ pushDeferred: false });
  });

  it('удень нове завдання надходить одразу, без позначки відкладення', async () => {
    await notify({ event: 'ASSIGNED', task, to: ['chief'] }, DAY);
    expect(pushToUser).toHaveBeenCalledTimes(1);
    expect(feed.createMany.mock.calls[0][0][0]).toMatchObject({ pushDeferred: false });
  });

  it('людина вимкнула сповіщення про нові завдання — нічого не відкладається', async () => {
    users.findActiveByIds.mockResolvedValue([{ ...user('chief'), notifyAssigned: false }]);
    await notify({ event: 'ASSIGNED', task, to: ['chief'] }, NIGHT);
    expect(feed.createMany.mock.calls[0][0][0]).toMatchObject({ pushDeferred: false });
  });
});
