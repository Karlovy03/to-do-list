import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';

const repo = vi.hoisted(() => ({
  findById: vi.fn(),
  transition: vi.fn(),
  markAssigneeDone: vi.fn(),
  pendingAssignees: vi.fn(),
  resetAssigneesDone: vi.fn(),
  markAllAssigneesDone: vi.fn(),
  clearReminderLogs: vi.fn(),
}));
const journal = vi.hoisted(() => ({ add: vi.fn() }));
const notifyInBackground = vi.hoisted(() => vi.fn());

vi.mock('../../core/prisma', () => ({ prisma: {}, transaction: (fn: (db: object) => unknown) => fn({}) }));
vi.mock('./task.repository', () => ({ taskRepository: repo, OPEN_STATUSES: ['NEW', 'IN_PROGRESS'] }));
vi.mock('./journal.repository', () => ({ journalRepository: journal }));
vi.mock('../notifications', () => ({ notifyInBackground }));

const { taskLifecycleService: life } = await import('./task-lifecycle.service');

const H = 3600_000;
const person = (id: string, role: User['role'] = 'MEMBER') => ({ id, role, fullName: `ПІБ ${id}` }) as User;
const chief = person('chief', 'MANAGER');
const exec = person('exec');
const exec2 = person('exec2');
const stranger = person('stranger');

const task = (over: Record<string, unknown> = {}) => ({
  id: 't1', number: 7, title: 'Довідка', priority: 'NORMAL', status: 'IN_PROGRESS',
  deadline: new Date(Date.now() + 24 * H), authorId: 'chief',
  isControlled: true, controllerUserId: null, controlSetById: 'chief',
  assignees: [{ userId: 'exec', doneAt: null }, { userId: 'exec2', doneAt: null }],
  ...over,
});

const lastNotify = () => notifyInBackground.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  repo.findById.mockResolvedValue(task());
  repo.transition.mockResolvedValue(true);
  repo.markAssigneeDone.mockResolvedValue(true);
});

describe('«Виконано»', () => {
  it('перший із двох виконавців — завдання лишається відкритим, автор дізнається про частку', async () => {
    repo.pendingAssignees.mockResolvedValue(1);
    await life.markDone(exec, 't1', '');
    expect(repo.transition).not.toHaveBeenCalled();
    expect(lastNotify()).toMatchObject({ event: 'DONE_PART', vars: { name: 'ПІБ exec' } });
    expect(lastNotify().to).toContain('chief');
  });

  it('останній виконавець — завдання стає DONE', async () => {
    repo.pendingAssignees.mockResolvedValue(0);
    await life.markDone(exec2, 't1', 'Надіслано листом');
    expect(repo.transition).toHaveBeenCalledWith('t1', ['NEW', 'IN_PROGRESS'], expect.objectContaining({ status: 'DONE', progress: 100 }), {});
    expect(lastNotify()).toMatchObject({ event: 'DONE', comment: { text: 'Надіслано листом' } });
  });

  it('подвійний клік — 409, другого запису в журналі немає', async () => {
    repo.markAssigneeDone.mockResolvedValue(false);
    await expect(life.markDone(exec, 't1', '')).rejects.toMatchObject({ status: 409 });
    expect(journal.add).not.toHaveBeenCalled();
  });

  it('керівник не може позначити «Виконано» за виконавця', async () => {
    await expect(life.markDone(chief, 't1', '')).rejects.toMatchObject({ status: 403 });
  });

  it('сторонній отримує 404 — існування завдання не розкривається', async () => {
    await expect(life.markDone(stranger, 't1', '')).rejects.toMatchObject({ status: 404 });
  });
});

describe('«Повернути в роботу»', () => {
  beforeEach(() => repo.findById.mockResolvedValue(task({ status: 'DONE' })));

  it('повертає, скидає позначки виконавців і повідомляє їх з коментарем', async () => {
    await life.returnBack(chief, 't1', 'Додайте дані за жовтень');
    expect(repo.transition).toHaveBeenCalledWith('t1', ['DONE'], expect.objectContaining({ status: 'IN_PROGRESS', progress: 0 }), {});
    expect(repo.resetAssigneesDone).toHaveBeenCalled();
    expect(repo.clearReminderLogs).toHaveBeenCalledWith('t1', { keepControl: true }, {});
    expect(lastNotify()).toMatchObject({ event: 'RETURNED', to: ['exec', 'exec2'], comment: { text: 'Додайте дані за жовтень' } });
  });

  it('якщо термін минув — без нового терміну не повертає', async () => {
    repo.findById.mockResolvedValue(task({ status: 'DONE', deadline: new Date(Date.now() - H) }));
    await expect(life.returnBack(chief, 't1', 'Доопрацювати')).rejects.toMatchObject({ status: 400, code: 'deadline_required' });
    expect(repo.transition).not.toHaveBeenCalled();
  });

  it('виконавець не може повертати', async () => {
    await expect(life.returnBack(exec, 't1', 'Хочу ще')).rejects.toMatchObject({ status: 403 });
  });

  it('одночасне повернення двома керівниками — другий отримує 409', async () => {
    repo.transition.mockResolvedValue(false);
    await expect(life.returnBack(chief, 't1', 'Ще раз')).rejects.toMatchObject({ status: 409 });
  });
});

describe('дострокове закриття і скасування', () => {
  it('автор закриває достроково — усі отримують «закрито достроково» з коментарем', async () => {
    await life.closeEarly(chief, 't1', 'Питання втратило актуальність');
    expect(repo.markAllAssigneesDone).toHaveBeenCalled();
    expect(lastNotify()).toMatchObject({ event: 'DONE', titleKey: 'notifications.progress.closed_early' });
  });

  it('виконавець не може закрити достроково чи скасувати', async () => {
    await expect(life.closeEarly(exec, 't1', 'Коментар')).rejects.toMatchObject({ status: 403 });
    await expect(life.cancel(exec, 't1', '')).rejects.toMatchObject({ status: 403 });
  });
});
