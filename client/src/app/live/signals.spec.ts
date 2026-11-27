import { describe, expect, it } from 'vitest';
import { keysFor, readSignal, retryDelay } from './signals';

describe('живі оновлення: сигнал → що перечитати', () => {
  it('завдання — списки, зведення, «Довідка», картка й календар; стрічка — лише стрічка', () => {
    expect(keysFor({ t: 'task', id: '1' })).toEqual([['tasks'], ['calendar']]);
    expect(keysFor({ t: 'absence' })).toEqual([['absences'], ['calendar']]);
    expect(keysFor({ t: 'template', id: 't1' })).toEqual([['templates']]);
    expect(keysFor({ t: 'presence', id: 'u1' })).toEqual([['monitoring', 'people'], ['monitoring', 'visits']]);
    expect(keysFor({ t: 'feed' })).toEqual([['notifications']]);
  });
  it('невідомий вид чи зіпсовані дані з мережі — ігноруються', () => {
    expect(readSignal('{"t":"task","id":"7"}')).toEqual({ t: 'task', id: '7' });
    expect(readSignal('{"t":"template","id":"t1"}')).toEqual({ t: 'template', id: 't1' });
    expect(readSignal('{"t":"drop_database"}')).toBeNull();
    expect(readSignal('не json')).toBeNull();
    expect(readSignal('null')).toBeNull();
  });
  it('пауза перед повтором росте до 30 с і не більше', () => {
    expect([0, 1, 2, 3, 4, 9].map((a) => retryDelay(a, 0))).toEqual([1000, 2000, 5000, 10000, 30000, 30000]);
    expect(retryDelay(0, 1)).toBe(2000);
  });
});
