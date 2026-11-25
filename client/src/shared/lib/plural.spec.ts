import { describe, expect, it } from 'vitest';
import { pluralForm } from './plural';

describe('українська множина', () => {
  it.each([
    [1, 'one'], [21, 'one'], [2, 'few'], [24, 'few'], [5, 'many'], [11, 'many'], [12, 'many'], [14, 'many'], [111, 'many'],
  ])('%i → %s', (n, f) => expect(pluralForm(n)).toBe(f));
});
