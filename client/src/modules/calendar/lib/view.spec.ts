import { describe, expect, it } from 'vitest';
import { defaultStart, shiftStart, visibleSpan } from './view';

const DAY: [number, number] = [8, 19];

describe('видиме вікно годин', () => {
  it('телефон — 3,5 години; ширше — скільки влазить, але не більше доби', () => {
    expect(visibleSpan(280, true, DAY)).toBe(3.5);
    expect(visibleSpan(1100, false, DAY)).toBe(11);
    expect(visibleSpan(400, false, [0, 24])).toBe(7);
  });
  it('починається за годину до «зараз», не виходячи за межі', () => {
    expect(defaultStart(3.5, DAY, 11.33)).toBe(10);
    expect(defaultStart(3.5, DAY, 7.5)).toBe(8);
    expect(defaultStart(3.5, DAY, 18.9)).toBe(15.5);
    expect(defaultStart(3.5, DAY, null)).toBe(8);
  });
  it('«раніше / пізніше» зсуває на 3 години й зупиняється на краях', () => {
    expect(shiftStart(10, 1, 3.5, DAY)).toBe(13);
    expect(shiftStart(13, 1, 3.5, DAY)).toBe(15.5);
    expect(shiftStart(9, -1, 3.5, DAY)).toBe(8);
  });
});
