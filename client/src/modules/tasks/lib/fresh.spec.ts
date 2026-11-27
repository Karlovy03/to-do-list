import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRESH_MS, isFresh, markFresh } from './fresh';

afterEach(() => vi.useRealTimers());

describe('підсвітка нового завдання', () => {
  it('картка свіжа рівно кілька секунд, потім — звичайна', () => {
    vi.useFakeTimers();
    markFresh('t1');
    expect(isFresh('t1')).toBe(true);
    expect(isFresh('t2')).toBe(false);
    vi.advanceTimersByTime(FRESH_MS - 1);
    expect(isFresh('t1')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isFresh('t1')).toBe(false);
  });
});
