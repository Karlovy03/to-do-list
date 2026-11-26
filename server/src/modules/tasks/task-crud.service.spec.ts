import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import type { Viewer } from '../access';

const repo = vi.hoisted(() => ({
  findById: vi.fn(),
  lockForUpdate: vi.fn(),
  removeAssignees: vi.fn(),
  forgetUsers: vi.fn(),
  addAssignees: vi.fn(),
  clearReminderLogs: vi.fn(),
  pendingAssignees: vi.fn(),
  transition: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
const journal = vi.hoisted(() => ({ add: vi.fn(), addMany: vi.fn() }));
const users = vi.hoisted(() => ({ countActiveByIds: vi.fn() }));
const notifyInBackground = vi.hoisted(() => vi.fn());

vi.mock('../../core/prisma', () => ({ prisma: {}, transaction: (fn: (db: object) => unknown) => fn({}) }));
vi.mock('./task.repository', () => ({ taskRepository: repo, OPEN_STATUSES: ['NEW', 'IN_PROGRESS'] }));
vi.mock('./journal.repository', () => ({ journalRepository: journal }));
vi.mock('../users', () => ({ usersRepository: users }));
vi.mock('../control', () => ({ NO_CONTROL: {}, resolveControl: vi.fn() }));
vi.mock('../notifications', () => ({ notifyInBackground }));

const { taskCrudService: crud } = await import('./task-crud.service');

const viewer = (id: string, role: User['role'], scope: Viewer['scope'] = new Set()) => ({ id, role, fullName: id, scope }) as Viewer;
const chief = viewer('chief', 'MANAGER', new Set(['analytics']));
const foreignChief = viewer('other', 'MANAGER', new Set(['control']));
const member = viewer('exec', 'MEMBER');

const person = (unitId: string | null) => ({ unitId });
const task = (over: Record<string, unknown> = {}) => ({
  id: 't1', number: 3, title: 'Довідка', priority: 'NORMAL', status: 'IN_PROGRESS',
  deadline: new Date(Date.now() + 864e5), authorId: 'chief', author: person('analytics'),
  isControlled: false, controllerUserId: null, controlSetById: null,
  assignees: [
    { userId: 'exec', doneAt: new Date(), user: person('analytics') },
    { userId: 'gone', doneAt: null, user: person('analytics') },
  ],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  repo.findById.mockResolvedValue(task());
  repo.update.mockImplementation(async () => task());
  repo.transition.mockResolvedValue(true);
  users.countActiveByIds.mockImplementation(async (ids: string[]) => ids.length);
});

describe('зміна виконавців', () => {
  it('зняли останнього, хто не позначив «Виконано», — завдання завершується дією системи', async () => {
    repo.pendingAssignees.mockResolvedValue(0);
    await crud.update(chief, 't1', { assigneeIds: ['exec'] });
    expect(repo.transition).toHaveBeenCalledWith('t1', ['NEW', 'IN_PROGRESS'], expect.objectContaining({ status: 'DONE' }), {});
    expect(journal.add).toHaveBeenCalledWith(expect.objectContaining({ authorId: null, kind: 'STATUS' }), {});
    expect(notifyInBackground).toHaveBeenCalledWith(expect.objectContaining({ event: 'DONE' }));
  });

  it('якщо хтось іще не позначив — завдання лишається відкритим', async () => {
    repo.pendingAssignees.mockResolvedValue(1);
    await crud.update(chief, 't1', { assigneeIds: ['exec', 'new'] });
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('вимкнений наявний виконавець не блокує правку — на активність перевіряються лише додані', async () => {
    repo.pendingAssignees.mockResolvedValue(1);
    await crud.update(chief, 't1', { assigneeIds: ['exec', 'gone', 'new'] });
    expect(users.countActiveByIds).toHaveBeenCalledWith(['new']);
  });

  it('доданий вимкнений користувач — 400', async () => {
    users.countActiveByIds.mockResolvedValue(0);
    await expect(crud.update(chief, 't1', { assigneeIds: ['exec', 'gone', 'new'] })).rejects.toMatchObject({ status: 400 });
  });
});

describe('права на зміну і видалення', () => {
  it('керівник чужої вертикалі отримує 404 і на зміну, і на видалення', async () => {
    await expect(crud.update(foreignChief, 't1', { title: 'Інше' })).rejects.toMatchObject({ status: 404 });
    await expect(crud.remove(foreignChief, 't1')).rejects.toMatchObject({ status: 404 });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('виконавець бачить завдання, але не змінює його', async () => {
    await expect(crud.update(member, 't1', { title: 'Інше' })).rejects.toMatchObject({ status: 403 });
  });

  it('керівник вертикалі не видаляє чуже завдання (ADR-0012), автор — видаляє', async () => {
    repo.findById.mockResolvedValue(task({ authorId: 'boss' }));
    await expect(crud.remove(chief, 't1')).rejects.toMatchObject({ status: 403 });
    repo.findById.mockResolvedValue(task());
    await crud.remove(chief, 't1');
    expect(repo.remove).toHaveBeenCalledWith('t1');
  });

  it('виконавець не створює завдання для іншої людини', async () => {
    const input = { title: 'Нове', description: '', priority: 'NORMAL' as const, deadline: new Date(Date.now() + 864e5), assigneeIds: ['chief'] };
    await expect(crud.create(member, input)).rejects.toMatchObject({ status: 403 });
  });
});
