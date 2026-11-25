import { describe, expect, it } from 'vitest';
import { recipients } from './notify.service';

describe('отримувачі сповіщення', () => {
  it('без повторів, без порожніх і без ініціатора дії', () => {
    expect(recipients(['chief', 'exec', 'chief', null, undefined, 'ctrl', 'exec'], 'ctrl')).toEqual(['chief', 'exec']);
  });
  it('ініціатор, що є і автором, і виконавцем, не отримує сповіщення про власну дію', () => {
    expect(recipients(['me', 'me'], 'me')).toEqual([]);
  });
});
