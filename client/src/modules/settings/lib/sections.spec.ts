import { describe, expect, it } from 'vitest';
import { sectionsFor } from './sections';

const paths = (role: Parameters<typeof sectionsFor>[0]) => sectionsFor(role).map((s) => s.to);

describe('«Ще → Розділи» за роллю', () => {
  it('виконавець бачить лише «Шаблони» — без «В строю» й «Довідки»', () => {
    expect(paths('MEMBER')).toEqual(['/templates']);
  });
  it('керівник і директор — ще «В строю» й «Довідку»; адміністратор — і «Адміністрування»', () => {
    expect(paths('MANAGER')).toEqual(['/templates', '/strength', '/report']);
    expect(paths('DIRECTOR')).toEqual(['/templates', '/strength', '/report']);
    expect(paths('ADMIN')).toEqual(['/templates', '/strength', '/report', '/admin']);
  });
});
