import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import type { Viewer } from '../access';

const repo = vi.hoisted(() => ({ findById: vi.fn(), create: vi.fn(), update: vi.fn(), addParticipants: vi.fn(), removeParticipants: vi.fn(), resetReminders: vi.fn(), cancel: vi.fn(), remove: vi.fn() }));
const users = vi.hoisted(() => ({ countActiveByIds: vi.fn() }));
const notifyInBackground = vi.hoisted(() => vi.fn());
vi.mock('../../core/prisma', () => ({ prisma: {}, transaction: (fn: (db: object) => unknown) => fn({}) }));
vi.mock('./events.repository', () => ({ eventsRepository: repo, EVENT_PAGE: 50 }));
vi.mock('../users', () => ({ usersRepository: users }));
vi.mock('../notifications', () => ({ notifyInBackground }));

const { eventsCrudService: crud } = await import('./events-crud.service');

const viewer = (id: string, role: User['role'] = 'MEMBER', scope: Viewer['scope'] = new Set()) => ({ id, role, fullName: id, scope }) as Viewer;
const member = viewer('exec');
const H = 3600_000;
const start = new Date(Date.now() + 6 * H);
const event = (over: Record<string, unknown> = {}) => ({
  id: 'e1', title: 'Нарада', description: '', status: 'PLANNED', startsAt: start, endsAt: new Date(start.getTime() + 0.5 * H),
  organizerId: 'org', organizer: { unitId: 'a' },
  participants: [{ userId: 'org', user: { unitId: 'a' } }, { userId: 'guest', user: { unitId: 'b' } }],
  ...over,
});
const calls = (kind: string) => notifyInBackground.mock.calls.map((c) => c[0]).filter((x) => x.event === kind);

beforeEach(() => {
  vi.clearAllMocks();
  users.countActiveByIds.mockImplementation(async (ids: string[]) => ids.length);
  repo.findById.mockResolvedValue(event());
  repo.update.mockImplementation(async () => event());
  repo.create.mockImplementation(async (data: { participants: { createMany: { data: { userId: string }[] } } }) => event({ participants: data.participants.createMany.data.map((p) => ({ userId: p.userId })) }));
  repo.cancel.mockResolvedValue(true);
});

describe('створення заходу', () => {
  it('виконавець може запросити колегу з іншого відділу; сам стає організатором і учасником', async () => {
    await crud.create(member, { title: 'Зустріч', description: '', startsAt: start, durationMin: 30, participantIds: ['colleague'] });
    const data = repo.create.mock.calls[0][0];
    expect(data.organizerId).toBe('exec');
    expect(data.participants.createMany.data.map((p: { userId: string }) => p.userId)).toEqual(['exec', 'colleague']);
    expect(data.endsAt.getTime() - data.startsAt.getTime()).toBe(30 * 60_000);
    expect(calls('EVENT_INVITED')[0]).toMatchObject({ to: ['exec', 'colleague'], actorId: 'exec' });
  });
  it('вимкнений чи неіснуючий учасник — 400', async () => {
    users.countActiveByIds.mockResolvedValue(0);
    await expect(crud.create(member, { title: 'Зустріч', description: '', startsAt: start, durationMin: 30, participantIds: ['ghost'] })).rejects.toMatchObject({ status: 400 });
  });
});

describe('зміна, скасування, видалення', () => {
  it('сторонній отримує 404, учасник — 403', async () => {
    await expect(crud.update(viewer('stranger'), 'e1', { title: 'Інше' })).rejects.toMatchObject({ status: 404 });
    await expect(crud.update(viewer('guest'), 'e1', { title: 'Інше' })).rejects.toMatchObject({ status: 403 });
    await expect(crud.cancel(viewer('guest'), 'e1', '')).rejects.toMatchObject({ status: 403 });
    await expect(crud.remove(viewer('guest'), 'e1')).rejects.toMatchObject({ status: 403 });
    expect(repo.remove).not.toHaveBeenCalled();
  });
  it('новий час скидає нагадування й повідомляє учасників; організатора зняти не можна', async () => {
    const later = new Date(start.getTime() + 2 * H);
    await crud.update(viewer('org'), 'e1', { startsAt: later, participantIds: ['newbie'] });
    expect(repo.resetReminders).toHaveBeenCalled();
    expect(repo.removeParticipants).toHaveBeenCalledWith('e1', ['guest'], {});
    expect(repo.addParticipants).toHaveBeenCalledWith('e1', ['newbie'], {});
    expect(calls('EVENT_CHANGED')[0].to).toEqual(['org']);
    expect(calls('EVENT_INVITED')[0].to).toEqual(['newbie']);
    expect(calls('EVENT_CANCELLED')[0]).toMatchObject({ to: ['guest'], titleKey: 'notifications.event.removed' });
  });
  it('зміна назви без зміни часу нагадування не скидає', async () => {
    await crud.update(viewer('org'), 'e1', { title: 'Нарада о 17:30' });
    expect(repo.resetReminders).not.toHaveBeenCalled();
    expect(calls('EVENT_CHANGED')).toHaveLength(0);
  });
  it('подвійне скасування — 409', async () => {
    repo.cancel.mockResolvedValue(false);
    await expect(crud.cancel(viewer('org'), 'e1', '')).rejects.toMatchObject({ status: 409 });
  });
  it('видалення запланованого заходу повідомляє учасників без посилання на нього', async () => {
    await crud.remove(viewer('org'), 'e1');
    expect(repo.remove).toHaveBeenCalledWith('e1');
    expect(calls('EVENT_CANCELLED')[0]).toMatchObject({ calendarEvent: { gone: true }, titleKey: 'notifications.event.deleted' });
  });
});
