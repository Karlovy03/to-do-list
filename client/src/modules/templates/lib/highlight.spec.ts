import { describe, expect, it } from 'vitest';
import { segments } from './highlight';

describe('підсвітка збігів', () => {
  it('без урахування регістру, кирилиця, кілька збігів; оригінальний регістр зберігається', () => {
    expect(segments('Відпустка і ВІДПУСТКИ', 'відпуст')).toEqual([
      { text: 'Відпуст', hit: true },
      { text: 'ка і ', hit: false },
      { text: 'ВІДПУСТ', hit: true },
      { text: 'КИ', hit: false },
    ]);
  });
  it('порожній запит чи немає збігу — текст як є', () => {
    expect(segments('Рапорт', '  ')).toEqual([{ text: 'Рапорт', hit: false }]);
    expect(segments('Рапорт', 'наказ')).toEqual([{ text: 'Рапорт', hit: false }]);
  });
  it('символи, що міняють довжину в нижньому регістрі, не зсувають підсвітку', () => {
    expect(segments('İ рапорт', 'рапорт')).toEqual([{ text: 'İ ', hit: false }, { text: 'рапорт', hit: true }]);
  });
});
