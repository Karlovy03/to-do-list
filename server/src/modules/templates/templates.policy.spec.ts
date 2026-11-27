import { describe, expect, it } from 'vitest';
import type { PolicyUser } from '../access';
import { canChangeTemplate } from './templates.policy';
import { foldCase, likePattern, searchTextOf } from './templates.search';

// вертикаль керівника відділу аналітики — він сам; сусідній відділ — контроль
const bondar: PolicyUser = { id: 'bondar', role: 'MEMBER', scope: new Set() };
const savchuk: PolicyUser = { id: 'savchuk', role: 'MEMBER', scope: new Set() };
const lead: PolicyUser = { id: 'melnyk', role: 'MANAGER', scope: new Set(['analytics']) };
const neighbour: PolicyUser = { id: 'tkachenko', role: 'MANAGER', scope: new Set(['control']) };
const director: PolicyUser = { id: 'chief', role: 'DIRECTOR', scope: 'all' };
const admin: PolicyUser = { id: 'admin', role: 'ADMIN', scope: 'all' };
const byBondar = { uploadedById: 'bondar', unitId: 'analytics' };

describe('хто змінює шаблон', () => {
  it('той, хто додав, — так; інший виконавець того ж відділу — ні', () => {
    expect(canChangeTemplate(byBondar, bondar)).toBe(true);
    expect(canChangeTemplate(byBondar, savchuk)).toBe(false);
  });
  it('керівник того підрозділу за вертикаллю — так; керівник сусіднього — ні', () => {
    expect(canChangeTemplate(byBondar, lead)).toBe(true);
    expect(canChangeTemplate(byBondar, neighbour)).toBe(false);
  });
  it('директор і адміністратор — так', () => {
    expect(canChangeTemplate(byBondar, director)).toBe(true);
    expect(canChangeTemplate(byBondar, admin)).toBe(true);
  });
  it('автора видалено (null) — ніхто з виконавців не стає «автором»; підрозділу немає — лише повний доступ', () => {
    expect(canChangeTemplate({ uploadedById: null, unitId: 'analytics' }, bondar)).toBe(false);
    expect(canChangeTemplate({ uploadedById: null, unitId: null }, lead)).toBe(false);
    expect(canChangeTemplate({ uploadedById: null, unitId: null }, director)).toBe(true);
  });
});

describe('пошуковий рядок', () => {
  it('нижній регістр для кирилиці й латиниці, довжина не змінюється', () => {
    expect(foldCase('ВІДПУСТКА Їжак Ґанок DOCX')).toBe('відпустка їжак ґанок docx');
    const s = 'İstanbul — Рапорт';
    expect(Array.from(foldCase(s))).toHaveLength(Array.from(s).length);
  });
  it('назва \\n опис \\n текст; немає опису чи тексту — порожні місця, позиції не зсуваються', () => {
    expect(searchTextOf('Рапорт', null, 'Текст')).toBe('рапорт\n\nтекст');
  });
  it('%, _ і \\ у запиті — буквально', () => {
    expect(likePattern('50%_a\\b')).toBe('%50\\%\\_a\\\\b%');
  });
});
