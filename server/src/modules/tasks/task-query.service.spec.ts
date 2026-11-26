import { describe, expect, it, vi } from 'vitest';
import type { Viewer } from '../access';

const repo = vi.hoisted(() => ({ listAll: vi.fn().mockResolvedValue([]) }));
vi.mock('./task.repository', () => ({ taskRepository: repo, OPEN_STATUSES: ['NEW', 'IN_PROGRESS'], LIST_PAGE: 50 }));
vi.mock('./journal.repository', () => ({ journalRepository: {}, JOURNAL_PAGE: 50 }));

const { taskQueryService } = await import('./task-query.service');

describe('довідка для наради', () => {
  it('лише відкриті контрольні в межах видимості — та сама умова, що й для списків', async () => {
    const exec = { id: 'exec', role: 'MEMBER', scope: new Set<string>() } as unknown as Viewer;
    await taskQueryService.report(exec);
    const where = repo.listAll.mock.calls[0][0];
    expect(where.AND[0]).toEqual({ OR: expect.arrayContaining([{ authorId: 'exec' }]) });
    expect(where.AND[1]).toEqual({ isControlled: true, status: { in: ['NEW', 'IN_PROGRESS'] } });
  });
});
