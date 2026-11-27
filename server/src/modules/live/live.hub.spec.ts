import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';

vi.mock('../units', () => ({ unitTree: async () => [], subtreeIds: (id: string) => new Set([id]) }));

const { liveHub, MAX_PER_USER } = await import('./live.hub');

const user = (id: string, role: User['role'] = 'MEMBER') => ({ id, role, unitId: null }) as User;
const sink = () => ({ chunks: [] as string[], ended: false, write(c: string) { this.chunks.push(c); }, end() { this.ended = true; } });

beforeEach(() => liveHub.closeAll());

describe('концентратор живих оновлень', () => {
  it('сигнал іде лише тим, кого пропускає умова, — лише вид і id, без змісту', async () => {
    const a = sink();
    const b = sink();
    liveHub.add(user('a'), a);
    liveHub.add(user('b'), b);
    await liveHub.publish({ t: 'task', id: 't1' }, (v) => v.id === 'a');
    expect(a.chunks).toEqual(['event: change\ndata: {"t":"task","id":"t1"}\n\n']);
    expect(b.chunks).toEqual([]);
  });

  it('одна людина — кілька вкладок: сигнал у кожну; понад межу закривається найстаріша', async () => {
    const tabs = Array.from({ length: MAX_PER_USER + 1 }, sink);
    for (const s of tabs) liveHub.add(user('a'), s);
    expect(tabs[0].ended).toBe(true);
    expect(liveHub.connections()).toBe(MAX_PER_USER);
    await liveHub.publish({ t: 'feed' }, () => true);
    expect(tabs.slice(1).every((s) => s.chunks.length === 1)).toBe(true);
  });

  it('dropUser закриває лише з\'єднання цієї людини, remove прибирає закриту вкладку', async () => {
    const a = sink();
    const b = sink();
    liveHub.add(user('a'), a);
    const cb = liveHub.add(user('b'), b);
    liveHub.dropUser('a');
    expect([a.ended, b.ended]).toEqual([true, false]);
    liveHub.remove(cb);
    expect(liveHub.connections()).toBe(0);
  });
});
