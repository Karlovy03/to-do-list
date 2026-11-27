import { describe, expect, it } from 'vitest';
import type { Template } from '../api/templates.api';
import { eyebrowText } from './eyebrow';
import { readTemplates, writeTemplates } from './params';

describe('пошук і тип в адресі', () => {
  it('туди й назад; невідомий тип ігнорується', () => {
    const sp = writeTemplates({ q: 'рапорт', type: 'pdf' });
    expect(sp.toString()).toBe('q=%D1%80%D0%B0%D0%BF%D0%BE%D1%80%D1%82&type=pdf');
    expect(readTemplates(sp)).toEqual({ q: 'рапорт', type: 'pdf' });
    expect(readTemplates(new URLSearchParams('type=exe'))).toEqual({ q: '', type: '' });
  });
});

describe('рядок над заголовком', () => {
  const hit = (where: 'name' | 'content') => ({ match: { in: where, snippet: null, lead: false, tail: false } }) as Template;
  it('кількість у бібліотеці з правильною множиною', () => {
    expect(eyebrowText(false, [], 1, false)).toBe('1 шаблон · Word, Excel, PDF');
    expect(eyebrowText(false, [], 3, false)).toBe('3 шаблони · Word, Excel, PDF');
    expect(eyebrowText(false, [], 12, false)).toBe('12 шаблонів · Word, Excel, PDF');
  });
  it('пошук: де знайдено (Figma 43)', () => {
    expect(eyebrowText(true, [hit('name'), hit('content')], 12, false)).toBe('Знайдено 2 · у назві й у тексті');
    expect(eyebrowText(true, [hit('content')], 12, false)).toBe('Знайдено 1 · у тексті');
    expect(eyebrowText(true, [hit('name')], 12, true)).toBe('Знайдено 1+ · у назві');
  });
});
